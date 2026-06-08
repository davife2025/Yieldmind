import cron from "node-cron"
import { createServerClient } from "@yieldmind/db"
import { calcWeightedAPY } from "@yieldmind/shared"

// ─────────────────────────────────────────────────────────────
// YieldMind — Agent Cron Job
// Runs the full agent pipeline every 30 minutes.
// This replaces the Vercel cron for production deployments.
// ─────────────────────────────────────────────────────────────

const DEMO_WALLET    = "0xDemoWallet0000000000000000000000000001"
const CRON_SCHEDULE  = "*/30 * * * *"  // every 30 minutes
let isRunning        = false
let lastRunAt: Date | null = null
let runCount         = 0

export async function runAgentPipeline(): Promise<void> {
  if (isRunning) {
    console.log("[Cron] Agent already running — skipping")
    return
  }

  isRunning = true
  const startMs = Date.now()
  runCount++
  console.log(`\n[Cron] Agent run #${runCount} started at ${new Date().toISOString()}`)

  try {
    const supabase = createServerClient()

    const { data: agent } = await supabase
      .from("agents")
      .select("id, total_value_usd, weighted_apy")
      .eq("wallet_address", DEMO_WALLET)
      .single()

    if (!agent) {
      console.error("[Cron] Agent not found — is the DB seeded?")
      return
    }

    const [
      { fetchAllYields, storeYieldSnapshots, detectYieldOpportunities, detectPortfolioDrift },
      { runRiskEngine, storeRiskAlerts },
      { reasonAboutYieldOpportunity, reasonAboutRisk, reasonAboutRebalance },
      { writeDecision },
      { loadPortfolioSnapshot },
    ] = await Promise.all([
      import("@yieldmind/agent/src/scanner/yieldScanner"),
      import("@yieldmind/agent/src/risk/riskEngine"),
      import("@yieldmind/agent/src/claude/reasoningEngine"),
      import("@yieldmind/agent/src/decisions/decisionWriter"),
      import("@yieldmind/agent/src/scanner/portfolioState"),
    ])

    let decisionsWritten = 0

    // 1. Yields
    const yields    = await fetchAllYields()
    await storeYieldSnapshots(yields)
    const priceMap: Record<string, number> = {
      USDY: 1.0, USDe: 1.0,
      mETH: yields.find(y => y.assetId === "mETH")?.priceUsd ?? 3524,
      fBTC: yields.find(y => y.assetId === "fBTC")?.priceUsd ?? 61130,
    }
    console.log(`[Cron] Yields stored: ${yields.map(y => `${y.assetId}=${y.apy.toFixed(2)}%`).join(" | ")}`)

    // 2. Portfolio context for Claude
    const portfolio = await loadPortfolioSnapshot()

    // 3. Yield opportunities → Claude
    if (portfolio) {
      const opps = await detectYieldOpportunities(yields)
      for (const opp of opps.filter(o => o.significance !== "MINOR")) {
        let reasoning = `${opp.assetId} APY changed ${opp.delta > 0 ? "+" : ""}${opp.delta.toFixed(3)}%.`
        let action    = "Monitoring."
        try {
          const r = await reasonAboutYieldOpportunity(portfolio, opp)
          reasoning = r.reasoning; action = r.action
        } catch { /* Kimi K2 / HuggingFace unavailable — using fallback */ }
        const id = await writeDecision({ agentId: agent.id, type: "YIELD", reasoning, actionTaken: action, status: "confirmed", assetId: opp.assetId, apyDelta: opp.delta })
        if (id) decisionsWritten++
      }
    }

    // 4. Risk engine → Claude
    const riskSignals = await runRiskEngine(agent.id)
    if (riskSignals.length) {
      await storeRiskAlerts(agent.id, riskSignals)
      if (portfolio) {
        for (const signal of riskSignals.filter(s => s.severity !== "LOW")) {
          let reasoning = signal.message
          let action    = ["HIGH","CRITICAL"].includes(signal.severity) ? "Reducing exposure." : "Monitoring."
          try {
            const r = await reasonAboutRisk(portfolio, signal)
            reasoning = r.reasoning; action = r.action
          } catch { /* Kimi K2 / HuggingFace unavailable — using fallback */ }
          const id = await writeDecision({ agentId: agent.id, type: "RISK", reasoning, actionTaken: action, status: "confirmed", assetId: signal.assetId ?? undefined })
          if (id) decisionsWritten++
        }
      }
    }

    // 5. Drift detection → Claude → update positions
    const drifted = await detectPortfolioDrift(agent.id)
    if (drifted.length) {
      let reasoning = `Drift: ${drifted.map(d => `${d.assetId} ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}%`).join(", ")}`
      let action    = `Rebalancing: ${drifted.map(d => d.assetId).join(" → ")}`
      try {
        if (portfolio) {
          const r = await reasonAboutRebalance(portfolio, drifted)
          reasoning = r.reasoning; action = r.action
        }
      } catch { /* Kimi K2 / HuggingFace unavailable — using fallback */ }

      const id = await writeDecision({ agentId: agent.id, type: "REBALANCE", reasoning, actionTaken: action, status: "confirmed" })
      if (id) decisionsWritten++

      // Update positions
      const fromEntry = drifted.reduce((a, b) => a.drift > b.drift ? a : b)
      const toEntry   = drifted.reduce((a, b) => a.drift < b.drift ? a : b)
      if (fromEntry.assetId !== toEntry.assetId) {
        const { data: positions } = await supabase.from("positions").select("asset_id, balance, value_usd").eq("agent_id", agent.id)
        const fp = positions?.find(p => p.asset_id === fromEntry.assetId)
        const tp = positions?.find(p => p.asset_id === toEntry.assetId)
        if (fp && tp && positions) {
          const amt  = Math.min(Math.abs(fromEntry.drift / 100) * fromEntry.valueUsd, fp.value_usd * 0.99)
          const nFv  = Math.max(0, fp.value_usd - amt)
          const nTv  = tp.value_usd + amt
          const tot  = positions.reduce((s, p) => s + (p.asset_id === fromEntry.assetId ? nFv : p.asset_id === toEntry.assetId ? nTv : p.value_usd), 0)
          const fP   = priceMap[fromEntry.assetId] ?? 1
          const tP   = priceMap[toEntry.assetId] ?? 1
          await Promise.all([
            supabase.from("positions").update({ balance: +Math.max(0, fp.balance - amt/fP).toFixed(8), value_usd: +nFv.toFixed(4), allocation_pct: tot>0?+((nFv/tot)*100).toFixed(4):0, updated_at: new Date().toISOString() }).eq("agent_id", agent.id).eq("asset_id", fromEntry.assetId),
            supabase.from("positions").update({ balance: +(tp.balance + amt/tP).toFixed(8),             value_usd: +nTv.toFixed(4), allocation_pct: tot>0?+((nTv/tot)*100).toFixed(4):0, updated_at: new Date().toISOString() }).eq("agent_id", agent.id).eq("asset_id", toEntry.assetId),
          ])
          console.log(`[Cron] Rebalanced ${fromEntry.assetId} → ${toEntry.assetId}: $${amt.toFixed(0)}`)
        }
      }
    }

    // 6. Update weighted APY
    const { data: fp } = await supabase.from("positions").select("value_usd, asset_id").eq("agent_id", agent.id)
    const newApy = calcWeightedAPY((fp ?? []).map(p => ({ value_usd: p.value_usd, apy: yields.find(y => y.assetId === p.asset_id)?.apy ?? 0 })))
    await supabase.from("agents").update({ weighted_apy: +newApy.toFixed(4) }).eq("id", agent.id)

    lastRunAt = new Date()
    const ms  = Date.now() - startMs
    console.log(`[Cron] Run #${runCount} complete in ${ms}ms | ${decisionsWritten} decisions | ${riskSignals.length} risk signals`)
  } catch (err: unknown) {
    console.error(`[Cron] Run #${runCount} failed:`, err instanceof Error ? err.message : String(err))
  } finally {
    isRunning = false
  }
}

export function startCron(): void {
  console.log(`[Cron] Starting agent cron — schedule: "${CRON_SCHEDULE}"`)
  console.log(`[Cron] Next run: in ~30 minutes (also runs immediately on start)`)

  // Run immediately on server start
  runAgentPipeline().catch(console.error)

  // Then on schedule
  cron.schedule(CRON_SCHEDULE, () => {
    runAgentPipeline().catch(console.error)
  })
}

export function getCronStatus() {
  return {
    isRunning,
    lastRunAt:   lastRunAt?.toISOString() ?? null,
    runCount,
    schedule:    CRON_SCHEDULE,
    nextRunApprox: lastRunAt
      ? new Date(lastRunAt.getTime() + 30 * 60 * 1000).toISOString()
      : null,
  }
}
