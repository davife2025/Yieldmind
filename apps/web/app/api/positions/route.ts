import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

const MOCK_STATS = {
  totalValue: 474810,
  weightedApy: 5.52,
  dailyYield: 71.74,
  decisionsToday: 4,
  totalChange24h: 0.38,
}

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, total_value_usd, weighted_apy, decisions_count")
      .eq("wallet_address", DEMO_WALLET)
      .single()

    if (agentError || !agent) return NextResponse.json(MOCK_STATS)

    // Count decisions today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: decisionsToday } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", today.toISOString())

    const dailyYield = (agent.total_value_usd * agent.weighted_apy) / 100 / 365

    // Calculate real 24h change from yield snapshots
    // Compare latest weighted APY vs snapshot from ~24h ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: oldSnapshots } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy")
      .lte("timestamp", oneDayAgo)
      .order("timestamp", { ascending: false })
      .limit(8) // up to 2 per asset

    let totalChange24h = 0.38 // fallback
    if (oldSnapshots && oldSnapshots.length >= 2) {
      // Simple average of all old APYs vs current weighted APY
      const avgOldApy = oldSnapshots.reduce((s, r) => s + r.apy, 0) / oldSnapshots.length
      totalChange24h = agent.weighted_apy - avgOldApy
    }

    return NextResponse.json({
      totalValue:     agent.total_value_usd,
      weightedApy:    agent.weighted_apy,
      dailyYield,
      decisionsToday: decisionsToday ?? 0,
      totalChange24h,
    })
  } catch (err) {
    console.error("[/api/positions]", err)
    return NextResponse.json(MOCK_STATS)
  }
}
