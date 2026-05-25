import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: positions, error } = await supabase
      .from("positions")
      .select(`
        asset_id,
        balance,
        value_usd,
        allocation_pct,
        target_allocation_pct,
        agents!inner(wallet_address)
      `)
      .eq("agents.wallet_address", "0xDemoWallet0000000000000000000000000001")

    if (error || !positions?.length) {
      // Fallback mock
      return NextResponse.json([
        { asset_id: "USDY", balance: 124500, value_usd: 124500, allocation_pct: 26.22, target_allocation_pct: 25, apy: 5.23, trend: 0.04 },
        { asset_id: "mETH", balance: 42.18,  value_usd: 148630, allocation_pct: 31.30, target_allocation_pct: 32, apy: 4.81, trend: 0.11 },
        { asset_id: "USDe", balance: 89200,  value_usd: 89200,  allocation_pct: 18.79, target_allocation_pct: 18, apy: 8.94, trend: -0.07 },
        { asset_id: "fBTC", balance: 1.84,   value_usd: 112480, allocation_pct: 23.69, target_allocation_pct: 25, apy: 3.12, trend: 0.22 },
      ])
    }

    // Get latest APY per asset from yield_snapshots
    const assetIds = positions.map((p) => p.asset_id)
    const { data: snapshots } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy, timestamp")
      .in("asset_id", assetIds)
      .order("timestamp", { ascending: false })
      .limit(assetIds.length * 2)

    // Latest APY per asset
    const latestApy: Record<string, number> = {}
    const prevApy: Record<string, number> = {}
    snapshots?.forEach((s) => {
      if (!latestApy[s.asset_id]) latestApy[s.asset_id] = s.apy
      else if (!prevApy[s.asset_id]) prevApy[s.asset_id] = s.apy
    })

    const result = positions.map((p) => ({
      asset_id: p.asset_id,
      balance: p.balance,
      value_usd: p.value_usd,
      allocation_pct: p.allocation_pct,
      target_allocation_pct: p.target_allocation_pct,
      apy: latestApy[p.asset_id] ?? 0,
      trend: (latestApy[p.asset_id] ?? 0) - (prevApy[p.asset_id] ?? latestApy[p.asset_id] ?? 0),
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[/api/positions/list] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
