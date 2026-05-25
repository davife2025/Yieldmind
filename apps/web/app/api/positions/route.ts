import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch agent (demo agent for now — will be wallet-gated in Session 5)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("wallet_address", "0xDemoWallet0000000000000000000000000001")
      .single()

    if (agentError || !agent) {
      // Return mock data if DB not seeded yet
      return NextResponse.json({
        totalValue: 474810,
        weightedApy: 5.52,
        dailyYield: 71.74,
        decisionsToday: 4,
        totalChange24h: 0.38,
      })
    }

    // Count decisions today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: decisionsToday } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", today.toISOString())

    const dailyYield = (agent.total_value_usd * agent.weighted_apy) / 100 / 365

    return NextResponse.json({
      totalValue: agent.total_value_usd,
      weightedApy: agent.weighted_apy,
      dailyYield,
      decisionsToday: decisionsToday ?? 0,
      totalChange24h: 0.38, // Will be calculated from snapshots in Session 2
    })
  } catch (err) {
    console.error("[/api/positions] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
