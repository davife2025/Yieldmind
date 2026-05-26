import "dotenv/config"
import {
  fetchAllYields,
  storeYieldSnapshots,
  detectYieldOpportunities,
  detectPortfolioDrift,
} from "./scanner/yieldScanner"
import { runRiskEngine, storeRiskAlerts } from "./risk/riskEngine"
import {
  reasonAboutRebalance,
  reasonAboutRisk,
  reasonAboutYieldOpportunity,
} from "./claude/reasoningEngine"
import { writeDecision } from "./decisions/decisionWriter"
import { loadPortfolioSnapshot, updatePortfolioStats } from "./scanner/portfolioState"
import { calcWeightedAPY } from "@yieldmind/shared"
import type { AgentRunResult } from "./types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Agent Orchestrator
// The main run loop: scan → detect → reason → decide → write
// ─────────────────────────────────────────────────────────────

async function runAgent(): Promise<AgentRunResult> {
  const ranAt = new Date()
  const errors: string[] = []
  let decisionsWritten = 0
  let rebalancesTriggered = 0

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`[YieldMind] Agent run started at ${ranAt.toISOString()}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  // ── 1. Load portfolio state ──────────────────────────────────────────────
  const portfolio = await loadPortfolioSnapshot()
  if (!portfolio) {
    console.error("[Agent] Could not load portfolio. Is the DB seeded?")
    return { agentId: "unknown", ranAt, yieldOpportunities: [], riskSignals: [], decisionsWritten: 0, rebalancesTriggered: 0, errors: ["Portfolio not found"] }
  }
  console.log(`[Agent] Portfolio loaded: $${portfolio.totalValueUsd.toLocaleString()} | APY: ${portfolio.weightedApy.toFixed(2)}%`)

  // ── 2. Fetch & store yield snapshots ────────────────────────────────────
  console.log("\n[Agent] Step 1/4 — Scanning yields...")
  const yields = await fetchAllYields()
  await storeYieldSnapshots(yields)
  yields.forEach((y) =>
    console.log(`  ${y.assetId.padEnd(6)} APY: ${y.apy.toFixed(3)}% | Price: $${y.priceUsd.toFixed(2)}`)
  )

  // ── 3. Detect yield opportunities ───────────────────────────────────────
  const yieldOpportunities = await detectYieldOpportunities(yields)
  if (yieldOpportunities.length) {
    console.log(`\n[Agent] Yield opportunities: ${yieldOpportunities.length}`)
    for (const opp of yieldOpportunities.filter((o) => o.significance !== "MINOR")) {
      const reasoning = await reasonAboutYieldOpportunity(portfolio, opp)
      const id = await writeDecision({
        agentId: portfolio.agentId,
        type: "YIELD",
        reasoning: reasoning.reasoning,
        actionTaken: reasoning.action,
        status: "confirmed",
        assetId: opp.assetId,
        apyDelta: opp.delta,
        valueDeltaUsd: reasoning.valueImpact || undefined,
      })
      if (id) decisionsWritten++
    }
  }

  // ── 4. Run risk engine ───────────────────────────────────────────────────
  console.log("\n[Agent] Step 2/4 — Running risk checks...")
  const riskSignals = await runRiskEngine(portfolio.agentId)

  if (riskSignals.length) {
    await storeRiskAlerts(portfolio.agentId, riskSignals)
    for (const signal of riskSignals.filter((s) => s.severity !== "LOW")) {
      const reasoning = await reasonAboutRisk(portfolio, signal)
      const id = await writeDecision({
        agentId: portfolio.agentId,
        type: "RISK",
        reasoning: reasoning.reasoning,
        actionTaken: reasoning.action,
        status: reasoning.action.includes("No action") ? "skipped" : "confirmed",
        assetId: signal.assetId ?? undefined,
        apyDelta: reasoning.apyImpact || undefined,
        valueDeltaUsd: reasoning.valueImpact || undefined,
      })
      if (id) decisionsWritten++
    }
  }

  // ── 5. Check portfolio drift → rebalance ────────────────────────────────
  console.log("\n[Agent] Step 3/4 — Checking portfolio drift...")
  const driftedPositions = await detectPortfolioDrift(portfolio.agentId)

  if (driftedPositions.length) {
    console.log(`[Agent] Drift detected in ${driftedPositions.length} position(s)`)
    const reasoning = await reasonAboutRebalance(portfolio, driftedPositions)

    const id = await writeDecision({
      agentId: portfolio.agentId,
      type: "REBALANCE",
      reasoning: reasoning.reasoning,
      actionTaken: reasoning.action,
      status: "confirmed",
      // tx_hash: populated in Session 3 with Mantle on-chain execution
      apyDelta: reasoning.apyImpact || undefined,
      valueDeltaUsd: reasoning.valueImpact || undefined,
    })
    if (id) {
      decisionsWritten++
      rebalancesTriggered++
    }
  } else {
    console.log("[Agent] No drift above threshold — portfolio balanced")
  }

  // ── 6. Update portfolio weighted APY ────────────────────────────────────
  console.log("\n[Agent] Step 4/4 — Updating portfolio stats...")
  const newWeightedApy = calcWeightedAPY(
    yields.map((y) => {
      const pos = portfolio.positions.find((p) => p.assetId === y.assetId)
      return { value_usd: pos?.valueUsd ?? 0, apy: y.apy }
    })
  )
  await updatePortfolioStats(portfolio.agentId, portfolio.totalValueUsd, newWeightedApy)
  console.log(`[Agent] Updated weighted APY: ${newWeightedApy.toFixed(3)}%`)

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`[YieldMind] Run complete`)
  console.log(`  Yield opportunities: ${yieldOpportunities.length}`)
  console.log(`  Risk signals:        ${riskSignals.length}`)
  console.log(`  Decisions written:   ${decisionsWritten}`)
  console.log(`  Rebalances:          ${rebalancesTriggered}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  return {
    agentId: portfolio.agentId,
    ranAt,
    yieldOpportunities,
    riskSignals,
    decisionsWritten,
    rebalancesTriggered,
    errors,
  }
}

// ── Polling loop ─────────────────────────────────────────────────────────
// Runs every 30 minutes (matches yield snapshot interval)

const POLL_INTERVAL_MS = 30 * 60 * 1000

async function startAgentLoop() {
  console.log("🧠 YieldMind Agent starting...")
  console.log(`   Poll interval: ${POLL_INTERVAL_MS / 60000} minutes`)
  console.log(`   Model: claude-sonnet-4-20250514`)

  // Run immediately on start
  await runAgent().catch((err) => console.error("[Agent] Run error:", err))

  // Then on interval
  setInterval(async () => {
    await runAgent().catch((err) => console.error("[Agent] Run error:", err))
  }, POLL_INTERVAL_MS)
}

// Only start the polling loop when executed directly (tsx src/index.ts)
// NOT when imported by Next.js API routes — that would start infinite loops in serverless
if (require.main === module) {
  startAgentLoop()
}

export { runAgent }
