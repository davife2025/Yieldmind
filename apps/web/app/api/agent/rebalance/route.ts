import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

export async function POST(req: NextRequest) {
  try {
    const { fromAsset, toAsset, amountUsd, reasoning, agentId } = await req.json()

    if (!fromAsset || !toAsset || !amountUsd || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Write decision to Supabase (optimistic)
    const { data: decision, error: decisionError } = await supabase
      .from("agent_decisions")
      .insert({
        agent_id: agentId,
        type: "REBALANCE",
        reasoning: reasoning ?? `Rebalance: ${fromAsset} → ${toAsset} for $${Number(amountUsd).toLocaleString()}`,
        action_taken: `Shifted $${Number(amountUsd).toLocaleString()} ${fromAsset} → ${toAsset}`,
        status: "pending",
        asset_id: fromAsset,
      })
      .select("id")
      .single()

    if (decisionError) throw decisionError

    // Attempt on-chain log — best-effort
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
    } catch (chainErr: any) {
      console.warn("[rebalance] On-chain log skipped:", chainErr.message)
    }

    // Confirm decision
    await supabase
      .from("agent_decisions")
      .update({ status: "confirmed", tx_hash: txHash })
      .eq("id", decision.id)

    return NextResponse.json({
      success: true,
      decisionId: decision.id,
      txHash,
      explorerUrl: txHash ? `https://explorer.testnet.mantle.xyz/tx/${txHash}` : null,
    })
  } catch (err: any) {
    console.error("[/api/agent/rebalance]", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
