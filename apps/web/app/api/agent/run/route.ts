import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// ─────────────────────────────────────────────────────────────
// POST /api/agent/run
// Triggers an agent run — called from dashboard "Run Agent" button
// In production this would be a cron job or webhook
// ─────────────────────────────────────────────────────────────

export async function POST() {
  try {
    // Dynamic import so the agent package runs server-side only
    // The agent package uses process.env directly
    const { runAgent } = await import("@yieldmind/agent/src/index")
    const result = await runAgent()

    return NextResponse.json({
      success: true,
      decisionsWritten: result.decisionsWritten,
      riskSignals: result.riskSignals.length,
      yieldOpportunities: result.yieldOpportunities.length,
      rebalancesTriggered: result.rebalancesTriggered,
      ranAt: result.ranAt,
    })
  } catch (err: any) {
    console.error("[/api/agent/run] Error:", err)
    return NextResponse.json(
      { success: false, error: err.message ?? "Agent run failed" },
      { status: 500 }
    )
  }
}

// GET — return latest agent run summary from DB
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
