import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"
import type { AssetId } from "@yieldmind/db"

// PATCH /api/positions/update
// Updates position balances + allocations after a rebalance.
// Called by /api/agent/rebalance and /api/agent/run.

interface PositionUpdate {
  agentId:    string
  fromAsset:  AssetId
  toAsset:    AssetId
  amountUsd:  number
  fromPrice:  number   // current USD price per fromAsset unit
  toPrice:    number   // current USD price per toAsset unit
}

export async function PATCH(req: NextRequest) {
  try {
    const body: PositionUpdate = await req.json()
    const { agentId, fromAsset, toAsset, amountUsd, fromPrice, toPrice } = body

    if (!agentId || !fromAsset || !toAsset || !amountUsd) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Fetch all positions for recalculating total
    const { data: positions, error: fetchErr } = await supabase
      .from("positions")
      .select("asset_id, balance, value_usd")
      .eq("agent_id", agentId)

    if (fetchErr || !positions?.length) {
      return NextResponse.json({ error: "Positions not found" }, { status: 404 })
    }

    const fromPos = positions.find(p => p.asset_id === fromAsset)
    const toPos   = positions.find(p => p.asset_id === toAsset)

    if (!fromPos || !toPos) {
      return NextResponse.json({ error: "Asset not found in positions" }, { status: 404 })
    }

    // Cap swap to 99% of available to avoid dust errors
    const actual       = Math.min(amountUsd, fromPos.value_usd * 0.99)
    const unitsSold    = fromPrice > 0 ? actual / fromPrice : 0
    const unitsBought  = toPrice   > 0 ? actual / toPrice   : 0

    const newFromBalance  = Math.max(0, fromPos.balance  - unitsSold)
    const newFromValueUsd = Math.max(0, fromPos.value_usd - actual)
    const newToBalance    = toPos.balance  + unitsBought
    const newToValueUsd   = toPos.value_usd + actual

    // Recalculate every position's allocation_pct using updated total
    const totalValue = positions.reduce((s, p) => {
      if (p.asset_id === fromAsset) return s + newFromValueUsd
      if (p.asset_id === toAsset)   return s + newToValueUsd
      return s + p.value_usd
    }, 0)

    const [fromUpdate, toUpdate] = await Promise.all([
      supabase.from("positions").update({
        balance:        +newFromBalance.toFixed(8),
        value_usd:      +newFromValueUsd.toFixed(4),
        allocation_pct: totalValue > 0 ? +((newFromValueUsd / totalValue) * 100).toFixed(4) : 0,
        updated_at:     new Date().toISOString(),
      }).eq("agent_id", agentId).eq("asset_id", fromAsset),

      supabase.from("positions").update({
        balance:        +newToBalance.toFixed(8),
        value_usd:      +newToValueUsd.toFixed(4),
        allocation_pct: totalValue > 0 ? +((newToValueUsd / totalValue) * 100).toFixed(4) : 0,
        updated_at:     new Date().toISOString(),
      }).eq("agent_id", agentId).eq("asset_id", toAsset),
    ])

    if (fromUpdate.error) throw fromUpdate.error
    if (toUpdate.error)   throw toUpdate.error

    // Also update agent total_value_usd to stay consistent
    await supabase
      .from("agents")
      .update({ total_value_usd: +totalValue.toFixed(4) })
      .eq("id", agentId)

    return NextResponse.json({
      success:  true,
      executed: actual,
      updated: {
        [fromAsset]: { balance: +newFromBalance.toFixed(8),  value_usd: +newFromValueUsd.toFixed(4) },
        [toAsset]:   { balance: +newToBalance.toFixed(8),    value_usd: +newToValueUsd.toFixed(4)   },
      },
      totalValue: +totalValue.toFixed(4),
    })
  } catch (err: unknown) {
    console.error("[/api/positions/update]", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
