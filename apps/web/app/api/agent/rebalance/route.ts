import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// POST /api/agent/rebalance
// Executes a rebalance: logs decision to Supabase + records on Mantle
export async function POST(req: NextRequest) {
  try {
    const { fromAsset, toAsset, amountUsd, reasoning, agentId } = await req.json()

    if (!fromAsset || !toAsset || !amountUsd || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Write decision to Supabase first (optimistic)
    const { data: decision, error: decisionError } = await supabase
      .from("agent_decisions")
      .insert({
        agent_id: agentId,
        type: "REBALANCE",
        reasoning: reasoning ?? `AI-initiated rebalance: ${fromAsset} → ${toAsset} for $${amountUsd.toLocaleString()}`,
        action_taken: `Shifted ${formatUSD(amountUsd)} ${fromAsset} → ${toAsset}`,
        status: "pending",
        asset_id: fromAsset,
      })
      .select("id")
      .single()

    if (decisionError) throw decisionError

    // 2. Attempt on-chain log via Mantle writer (non-blocking if contract not deployed)
    let txHash: string | null = null
    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      const writer = getMantleWriter()

      // Get agent's NFT token ID
      const { data: agent } = await supabase
        .from("agents")
        .select("wallet_address, nft_token_id")
        .eq("id", agentId)
        .single()

      if (agent?.nft_token_id && agent?.wallet_address) {
        txHash = await writer.logDecision(
          {
            agentId,
            type: "REBALANCE",
            reasoning: reasoning ?? `Rebalance: ${fromAsset} → ${toAsset}`,
            assetId: fromAsset,
            status: "confirmed",
            valueDeltaUsd: 0,
            apyDelta: 0,
          },
          agent.nft_token_id,
          agent.wallet_address
        )
      }
    } catch (chainErr) {
      // On-chain logging is best-effort — don't fail the whole request
      console.warn("[Rebalance] On-chain log skipped:", chainErr)
    }

    // 3. Update decision with tx hash + confirmed status
    await supabase
      .from("agent_decisions")
      .update({ status: "confirmed", tx_hash: txHash })
      .eq("id", decision.id)

    return NextResponse.json({
      success: true,
      decisionId: decision.id,
      txHash,
      explorerUrl: txHash
        ? `https://explorer.testnet.mantle.xyz/tx/${txHash}`
        : null,
    })
  } catch (err: any) {
    console.error("[/api/agent/rebalance] Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

function formatUSD(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)
}
