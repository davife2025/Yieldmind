import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// POST /api/agent/rebalance
// Full rebalance pipeline:
//   1. Write decision to Supabase (pending)
//   2. Update position balances in DB
//   3. Log decision on Mantle chain (best-effort)
//   4. Confirm decision status

export async function POST(req: NextRequest) {
  try {
    const { fromAsset, toAsset, amountUsd, reasoning, agentId, fromPrice, toPrice } = await req.json()

    if (!fromAsset || !toAsset || !amountUsd || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Write pending decision
    const { data: decision, error: decisionError } = await supabase
      .from("agent_decisions")
      .insert({
        agent_id:    agentId,
        type:        "REBALANCE",
        reasoning:   reasoning ?? `Rebalance: ${fromAsset} → ${toAsset} for $${Number(amountUsd).toLocaleString()}`,
        action_taken: `Shifted $${Number(amountUsd).toLocaleString()} ${fromAsset} → ${toAsset}`,
        status:      "pending",
        asset_id:    fromAsset,
        value_delta_usd: 0,
      })
      .select("id")
      .single()

    if (decisionError) throw decisionError

    // 2. Update position balances
    // Use provided prices or fetch live prices
    let resolvedFromPrice = fromPrice ?? 1
    let resolvedToPrice   = toPrice   ?? 1

    if (!fromPrice || !toPrice) {
      try {
        const pricesRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/bybit/prices`
        )
        if (pricesRes.ok) {
          const prices = await pricesRes.json()
          const priceMap: Record<string, number> = {
            USDY: 1.0,
            USDe: 1.0,
            mETH: prices.ETH?.price ?? 3524,
            fBTC: prices.BTC?.price ?? 61130,
          }
          resolvedFromPrice = priceMap[fromAsset] ?? 1
          resolvedToPrice   = priceMap[toAsset]   ?? 1
        }
      } catch {
        // Use defaults if price fetch fails
      }
    }

    // Fetch positions and update
    const { data: positions } = await supabase
      .from("positions")
      .select("asset_id, balance, value_usd")
      .eq("agent_id", agentId)

    if (positions?.length) {
      const fromPos = positions.find(p => p.asset_id === fromAsset)
      const toPos   = positions.find(p => p.asset_id === toAsset)

      if (fromPos && toPos) {
        const actual       = Math.min(Number(amountUsd), fromPos.value_usd * 0.99)
        const unitsSold    = resolvedFromPrice > 0 ? actual / resolvedFromPrice : 0
        const unitsBought  = resolvedToPrice   > 0 ? actual / resolvedToPrice   : 0
        const newFromValue = Math.max(0, fromPos.value_usd - actual)
        const newToValue   = toPos.value_usd + actual
        const totalValue   = positions.reduce((s, p) => {
          if (p.asset_id === fromAsset) return s + newFromValue
          if (p.asset_id === toAsset)   return s + newToValue
          return s + p.value_usd
        }, 0)

        await Promise.all([
          supabase.from("positions").update({
            balance:        +Math.max(0, fromPos.balance - unitsSold).toFixed(8),
            value_usd:      +newFromValue.toFixed(4),
            allocation_pct: totalValue > 0 ? +((newFromValue / totalValue) * 100).toFixed(4) : 0,
            updated_at:     new Date().toISOString(),
          }).eq("agent_id", agentId).eq("asset_id", fromAsset),

          supabase.from("positions").update({
            balance:        +(toPos.balance + unitsBought).toFixed(8),
            value_usd:      +newToValue.toFixed(4),
            allocation_pct: totalValue > 0 ? +((newToValue / totalValue) * 100).toFixed(4) : 0,
            updated_at:     new Date().toISOString(),
          }).eq("agent_id", agentId).eq("asset_id", toAsset),

          supabase.from("agents").update({
            total_value_usd: +totalValue.toFixed(4),
          }).eq("id", agentId),
        ])
      }
    }

    // 3. Attempt on-chain log (best-effort)
    let txHash: string | null = null
    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      const writer = getMantleWriter()
      const { data: agent } = await supabase
        .from("agents")
        .select("wallet_address, nft_token_id")
        .eq("id", agentId)
        .single()
      if (agent?.nft_token_id && agent?.wallet_address) {
        txHash = await writer.logDecision(
          { agentId, type: "REBALANCE", reasoning: reasoning ?? "", assetId: fromAsset, status: "confirmed" },
          agent.nft_token_id,
          agent.wallet_address
        )
      }
    } catch (chainErr: unknown) {
      console.warn("[rebalance] On-chain log skipped:", chainErr.message)
    }

    // 4. Confirm decision
    await supabase
      .from("agent_decisions")
      .update({ status: "confirmed", tx_hash: txHash })
      .eq("id", decision.id)

    return NextResponse.json({
      success:     true,
      decisionId:  decision.id,
      txHash,
      explorerUrl: txHash ? `https://explorer.testnet.mantle.xyz/tx/${txHash}` : null,
    })
  } catch (err: unknown) {
    console.error("[/api/agent/rebalance]", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
