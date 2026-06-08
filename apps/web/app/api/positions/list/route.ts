import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

const FALLBACK = [
  { asset_id: "USDY", balance: 124500, value_usd: 124500, allocation_pct: 26.22, target_allocation_pct: 25, apy: 5.23, trend: 0.04 },
  { asset_id: "mETH", balance: 42.18,  value_usd: 148630, allocation_pct: 31.30, target_allocation_pct: 32, apy: 4.81, trend: 0.11 },
  { asset_id: "USDe", balance: 89200,  value_usd: 89200,  allocation_pct: 18.79, target_allocation_pct: 18, apy: 8.94, trend: -0.07 },
  { asset_id: "fBTC", balance: 1.84,   value_usd: 112480, allocation_pct: 23.69, target_allocation_pct: 25, apy: 3.12, trend: 0.22 },
]

export async function GET() {
  try {
    const supabase = createServerClient()

    // Step 1: get agent id by wallet (avoids broken join filter syntax)
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("wallet_address", DEMO_WALLET)
      .single()

    if (!agent) return NextResponse.json(FALLBACK)

    // Step 2: fetch positions for this agent
    const { data: positions, error } = await supabase
      .from("positions")
      .select("asset_id, balance, value_usd, allocation_pct, target_allocation_pct")
      .eq("agent_id", agent.id)

    if (error || !positions?.length) return NextResponse.json(FALLBACK)

    // Step 3: get latest 2 APY snapshots per asset for trend calculation
    const assetIds = positions.map(p => p.asset_id)
    const { data: snapshots } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy, timestamp")
      .in("asset_id", assetIds)
      .order("timestamp", { ascending: false })
      .limit(assetIds.length * 2)

    // Build latest + previous APY maps
    const latestApy: Record<string, number> = {}
    const prevApy:   Record<string, number> = {}
    for (const s of snapshots ?? []) {
      if (!latestApy[s.asset_id])      latestApy[s.asset_id] = s.apy
      else if (!prevApy[s.asset_id])   prevApy[s.asset_id]   = s.apy
    }

    return NextResponse.json(
      positions.map(p => ({
        asset_id:              p.asset_id,
        balance:               p.balance,
        value_usd:             p.value_usd,
        allocation_pct:        p.allocation_pct,
        target_allocation_pct: p.target_allocation_pct,
        apy:   latestApy[p.asset_id] ?? 0,
        trend: (latestApy[p.asset_id] ?? 0) - (prevApy[p.asset_id] ?? latestApy[p.asset_id] ?? 0),
      }))
    )
  } catch (err: unknown) {
    console.error("[/api/positions/list]", err)
    return NextResponse.json(FALLBACK)
  }
}
