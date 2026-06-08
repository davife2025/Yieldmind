import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// GET /api/agent/status
// Returns agent operational status: last run, next scheduled run,
// decision counts, active alert count.
// Polled by AgentControls every 30s.

export async function GET() {
  try {
    const supabase = createServerClient()

    // Get most recent decision (= last agent run)
    const { data: lastDecision } = await supabase
      .from("agent_decisions")
      .select("created_at, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Count decisions in last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: decisions24h } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday)

    // Count decisions in last hour
    const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: decisionsLastHour } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastHour)

    // Active alert count
    const { count: activeAlerts } = await supabase
      .from("risk_alerts")
      .select("*", { count: "exact", head: true })
      .eq("resolved", false)

    // Total decisions ever
    const { count: totalDecisions } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })

    const lastRunAt = lastDecision?.created_at ?? null
    const pollIntervalMs = 30 * 60 * 1000 // 30 minutes

    // Estimate next run (last run + 30 min, or now if overdue)
    const nextRunAt = lastRunAt
      ? new Date(new Date(lastRunAt).getTime() + pollIntervalMs).toISOString()
      : new Date(Date.now() + pollIntervalMs).toISOString()

    const isOverdue = lastRunAt
      ? Date.now() - new Date(lastRunAt).getTime() > pollIntervalMs * 1.5
      : false

    return NextResponse.json({
      status:             isOverdue ? "overdue" : "active",
      lastRunAt,
      nextRunAt,
      pollIntervalMinutes: 30,
      model:              "moonshotai/Kimi-K2-Instruct",
      network:            "Mantle Testnet",
      chainId:            5003,
      decisions: {
        total:      totalDecisions      ?? 0,
        last24h:    decisions24h        ?? 0,
        lastHour:   decisionsLastHour   ?? 0,
      },
      activeAlerts: activeAlerts ?? 0,
    })
  } catch (err: unknown) {
    console.error("[/api/agent/status]", err)
    return NextResponse.json({
      status:   "unknown",
      error:    err.message,
      lastRunAt: null,
      nextRunAt: null,
    }, { status: 500 })
  }
}
