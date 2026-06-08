import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

// POST /api/agent/run
// Full agent pipeline with Claude AI reasoning on every decision:
//   1. Fetch + store yield snapshots (Bybit prices)
//   2. Detect yield opportunities → Claude reasons → write decisions
//   3. Run risk engine → Claude reasons → write alerts + decisions
//   4. Detect portfolio drift → Claude reasons → write rebalance + update positions
//   5. Update agent weighted APY

export async function POST() {
  try {
    const supabase = createServerClient()

    const { data: agent } = await supabase
      .from("agents")
      .select("id, total_value_usd, weighted_apy")
      .eq("wallet_address", DEMO_WALLET)
      .single()

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found. Run: supabase db seed" },
        { status: 404 }
      )
    }

    // Import all agent modules
    const [
      { fetchAllYields, storeYieldSnapshots, detectYieldOpportunities, detectPortfolioDrift },
      { runRiskEngine, storeRiskAlerts },
      { reasonAboutYieldOpportunity, reasonAboutRisk, reasonAboutRebalance },
      { writeDecision },
      { loadPortfolioSnapshot },
      { calcWeightedAPY },
    ] = await Promise.all([
      import("@yieldmind/agent/src/scanner/yieldScanner"),
      import("@yieldmind/agent/src/risk/riskEngine"),
      import("@yieldmind/agent/src/claude/reasoningEngine"),
      import("@yieldmind/agent/src/decisions/decisionWriter"),
      import("@yieldmind/agent/src/scanner/portfolioState"),
      import("@yieldmind/shared"),
    ])

    let decisionsWritten    = 0
    let rebalancesTriggered = 0

    // ── 1. Yield snapshots ──────────────────────────────────────────────────
    const yields = await fetchAllYields()
    await storeYieldSnapshots(yields)

    // Build price map for position update math
    const priceMap: Record<string, number> = {
      USDY: 1.0,
      USDe: 1.0,
      mETH: yields.find(y => y.assetId === "mETH")?.priceUsd ?? 3524,
      fBTC: yields.find(y => y.assetId === "fBTC")?.priceUsd ?? 61130,
    }

    // ── Load portfolio snapshot for Claude context ──────────────────────────
    const portfolio = await loadPortfolioSnapshot()
    if (!portfolio) {
      return NextResponse.json({ success: false, error: "Portfolio snapshot unavailable" }, { status: 500 })
    }

    // ── 2. Yield opportunities → Claude reasons ─────────────────────────────
    const yieldOpps = await detectYieldOpportunities(yields)
    for (const opp of yieldOpps.filter(o => o.significance !== "MINOR")) {
      let reasoning = `${opp.assetId} APY ${opp.direction === "UP" ? "increased" : "decreased"} ${Math.abs(opp.delta).toFixed(3)}% (${opp.previousApy.toFixed(2)}% → ${opp.currentApy.toFixed(2)}%).`
      let action    = opp.direction === "DOWN" ? "Monitoring position for reallocation." : "APY improvement noted."
      let apyImpact = 0

      try {
        const claudeResult = await reasonAboutYieldOpportunity(portfolio, opp)
        reasoning  = claudeResult.reasoning
        action     = claudeResult.action
        apyImpact  = claudeResult.apyImpact
      } catch {
        // Kimi K2 / HuggingFace unavailable — use fallback strings above
      }

      const id = await writeDecision({
        agentId:     agent.id,
        type:        "YIELD",
        reasoning,
        actionTaken: action,
        status:      "confirmed",
        assetId:     opp.assetId,
        apyDelta:    opp.delta + apyImpact,
      })
      if (id) decisionsWritten++
    }

    // ── 3. Risk engine → Claude reasons ────────────────────────────────────
    const riskSignals = await runRiskEngine(agent.id)
    if (riskSignals.length) {
      await storeRiskAlerts(agent.id, riskSignals)

      for (const signal of riskSignals.filter(s => s.severity !== "LOW")) {
        let reasoning = signal.message
        let action    = ["HIGH", "CRITICAL"].includes(signal.severity)
          ? "Immediate exposure reduction triggered."
          : "Position monitored. Threshold breach logged."
        let valueDelta = 0

        try {
          const claudeResult = await reasonAboutRisk(portfolio, signal)
          reasoning  = claudeResult.reasoning
          action     = claudeResult.action
          valueDelta = claudeResult.valueImpact
        } catch {
          // Kimi K2 / HuggingFace unavailable — use fallback strings above
        }

        const id = await writeDecision({
          agentId:       agent.id,
          type:          "RISK",
          reasoning,
          actionTaken:   action,
          status:        "confirmed",
          assetId:       signal.assetId ?? undefined,
          valueDeltaUsd: valueDelta || undefined,
        })
        if (id) decisionsWritten++
      }
    }

    // ── 4. Portfolio drift → Claude reasons → rebalance ────────────────────
    const drifted = await detectPortfolioDrift(agent.id)
    if (drifted.length) {
      let reasoning = `Portfolio drift detected: ${drifted.map(d => `${d.assetId} ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}%`).join(", ")}. Rebalancing to restore target allocations.`
      let action    = `Rebalance queued for: ${drifted.map(d => d.assetId).join(", ")}`
      let apyImpact = 0

      try {
        const claudeResult = await reasonAboutRebalance(portfolio, drifted)
        reasoning  = claudeResult.reasoning
        action     = claudeResult.action
        apyImpact  = claudeResult.apyImpact
      } catch {
        // Kimi K2 / HuggingFace unavailable — use fallback strings above
      }

      const id = await writeDecision({
        agentId:     agent.id,
        type:        "REBALANCE",
        reasoning,
        actionTaken: action,
        status:      "confirmed",
        apyDelta:    apyImpact || undefined,
      })
      if (id) decisionsWritten++
      rebalancesTriggered++

      // Actually update positions — pick most overweight → most underweight
      const fromEntry = drifted.reduce((a, b) => a.drift > b.drift ? a : b)
      const toEntry   = drifted.reduce((a, b) => a.drift < b.drift ? a : b)

      if (fromEntry.assetId !== toEntry.assetId) {
        const amountUsd   = Math.abs(fromEntry.drift / 100) * fromEntry.valueUsd
        const fromPrice   = priceMap[fromEntry.assetId] ?? 1
        const toPrice     = priceMap[toEntry.assetId]   ?? 1

        const { data: positions } = await supabase
          .from("positions")
          .select("asset_id, balance, value_usd")
          .eq("agent_id", agent.id)

        if (positions?.length) {
          const fromPos = positions.find(p => p.asset_id === fromEntry.assetId)
          const toPos   = positions.find(p => p.asset_id === toEntry.assetId)

          if (fromPos && toPos) {
            const actual      = Math.min(amountUsd, fromPos.value_usd * 0.99)
            const unitsSold   = fromPrice > 0 ? actual / fromPrice : 0
            const unitsBought = toPrice   > 0 ? actual / toPrice   : 0
            const newFromVal  = Math.max(0, fromPos.value_usd - actual)
            const newToVal    = toPos.value_usd + actual
            const totalVal    = positions.reduce((s, p) => {
              if (p.asset_id === fromEntry.assetId) return s + newFromVal
              if (p.asset_id === toEntry.assetId)   return s + newToVal
              return s + p.value_usd
            }, 0)

            await Promise.all([
              supabase.from("positions").update({
                balance:        +Math.max(0, fromPos.balance - unitsSold).toFixed(8),
                value_usd:      +newFromVal.toFixed(4),
                allocation_pct: totalVal > 0 ? +((newFromVal / totalVal) * 100).toFixed(4) : 0,
                updated_at:     new Date().toISOString(),
              }).eq("agent_id", agent.id).eq("asset_id", fromEntry.assetId),

              supabase.from("positions").update({
                balance:        +(toPos.balance + unitsBought).toFixed(8),
                value_usd:      +newToVal.toFixed(4),
                allocation_pct: totalVal > 0 ? +((newToVal / totalVal) * 100).toFixed(4) : 0,
                updated_at:     new Date().toISOString(),
              }).eq("agent_id", agent.id).eq("asset_id", toEntry.assetId),
            ])
          }
        }
      }
    }

    // ── 5. Update weighted APY ──────────────────────────────────────────────
    const { data: freshPositions } = await supabase
      .from("positions")
      .select("value_usd, asset_id")
      .eq("agent_id", agent.id)

    const newApy = calcWeightedAPY(
      (freshPositions ?? []).map(p => ({
        value_usd: p.value_usd,
        apy: yields.find(y => y.assetId === p.asset_id)?.apy ?? 0,
      }))
    )

    await supabase
      .from("agents")
      .update({ weighted_apy: +newApy.toFixed(4) })
      .eq("id", agent.id)

    return NextResponse.json({
      success:             true,
      decisionsWritten,
      riskSignals:         riskSignals.length,
      yieldOpportunities:  yieldOpps.length,
      rebalancesTriggered,
      ranAt:               new Date().toISOString(),
    })
  } catch (err: unknown) {
    console.error("[/api/agent/run]", err)
    return NextResponse.json(
      { success: false, error: err.message ?? "Agent run failed" },
      { status: 500 }
    )
  }
}

// GET — recent decisions
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from("agent_decisions")
      .select("id, type, reasoning, action_taken, tx_hash, status, asset_id, created_at, apy_delta, value_delta_usd")
      .order("created_at", { ascending: false })
      .limit(20)
    return NextResponse.json({ decisions: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
