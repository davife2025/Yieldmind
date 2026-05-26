import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// POST /api/agent/run — triggers an agent run
export async function POST() {
  try {
    const supabase = createServerClient()

    // Fetch current portfolio state
    const { data: agent } = await supabase
      .from("agents")
      .select("id, total_value_usd, weighted_apy")
      .eq("wallet_address", "0xDemoWallet0000000000000000000000000001")
      .single()

    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found. Run: supabase db seed" }, { status: 404 })
    }

    // Import agent modules server-side
    const { fetchAllYields, storeYieldSnapshots, detectYieldOpportunities, detectPortfolioDrift } =
      await import("@yieldmind/agent/src/scanner/yieldScanner")
    const { runRiskEngine, storeRiskAlerts } =
      await import("@yieldmind/agent/src/risk/riskEngine")
    const { writeDecision } =
      await import("@yieldmind/agent/src/decisions/decisionWriter")
    const { calcWeightedAPY } = await import("@yieldmind/shared")

    let decisionsWritten = 0
    let rebalancesTriggered = 0

    // 1. Fetch + store yield snapshots
    const yields = await fetchAllYields()
    await storeYieldSnapshots(yields)

    // 2. Detect yield opportunities
    const yieldOpps = await detectYieldOpportunities(yields)
    for (const opp of yieldOpps.filter(o => o.significance !== "MINOR")) {
      const id = await writeDecision({
        agentId: agent.id,
        type: "YIELD",
        reasoning: `${opp.assetId} APY ${opp.direction === "UP" ? "increased" : "decreased"} by ${Math.abs(opp.delta).toFixed(3)}% (${opp.previousApy.toFixed(2)}% → ${opp.currentApy.toFixed(2)}%). Significance: ${opp.significance}.`,
        actionTaken: opp.direction === "DOWN" ? "Monitoring position for reallocation opportunity" : "APY improvement noted. Current allocation maintained.",
        status: "confirmed",
        assetId: opp.assetId,
        apyDelta: opp.delta,
      })
      if (id) decisionsWritten++
    }

    // 3. Run risk engine
    const riskSignals = await runRiskEngine(agent.id)
    if (riskSignals.length) {
      await storeRiskAlerts(agent.id, riskSignals)
      for (const signal of riskSignals.filter(s => s.severity !== "LOW")) {
        const id = await writeDecision({
          agentId: agent.id,
          type: "RISK",
          reasoning: signal.message,
          actionTaken: signal.severity === "HIGH" || signal.severity === "CRITICAL"
            ? "Immediate exposure reduction triggered"
            : "Position monitored. Threshold breach logged.",
          status: "confirmed",
          assetId: signal.assetId ?? undefined,
        })
        if (id) decisionsWritten++
      }
    }

    // 4. Check drift → rebalance
    const drifted = await detectPortfolioDrift(agent.id)
    if (drifted.length) {
      const summary = drifted.map(d => `${d.assetId} ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}%`).join(", ")
      const id = await writeDecision({
        agentId: agent.id,
        type: "REBALANCE",
        reasoning: `Portfolio drift detected: ${summary}. Rebalancing to restore target allocations within 2.5% threshold.`,
        actionTaken: `Rebalance queued for: ${drifted.map(d => d.assetId).join(", ")}`,
        status: "confirmed",
      })
      if (id) { decisionsWritten++; rebalancesTriggered++ }
    }

    // 5. Update weighted APY
    const newApy = calcWeightedAPY(
      yields.map(y => {
        const pos = drifted.find(d => d.assetId === y.assetId)
        return { value_usd: pos?.valueUsd ?? 100000, apy: y.apy }
      })
    )
    await supabase.from("agents").update({ weighted_apy: newApy }).eq("id", agent.id)

    return NextResponse.json({
      success: true,
      decisionsWritten,
      riskSignals: riskSignals.length,
      yieldOpportunities: yieldOpps.length,
      rebalancesTriggered,
      ranAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("[/api/agent/run] Error:", err)
    return NextResponse.json({ success: false, error: err.message ?? "Agent run failed" }, { status: 500 })
  }
}

// GET — return recent agent decisions
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: decisions } = await supabase
      .from("agent_decisions")
      .select("id, type, reasoning, action_taken, tx_hash, status, asset_id, created_at, apy_delta, value_delta_usd")
      .order("created_at", { ascending: false })
      .limit(20)
    return NextResponse.json({ decisions: decisions ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
