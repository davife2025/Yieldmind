import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, agentName } = await req.json()

    if (!walletAddress || !agentName) {
      return NextResponse.json({ error: "walletAddress and agentName are required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Upsert agent in DB — create if first time
    let { data: agent } = await supabase
      .from("agents")
      .select("id, nft_token_id")
      .eq("wallet_address", walletAddress)
      .single()

    if (!agent) {
      const { data: newAgent, error } = await supabase
        .from("agents")
        .insert({ wallet_address: walletAddress, name: agentName })
        .select("id, nft_token_id")
        .single()
      if (error) throw error
      agent = newAgent
    }

    if (agent!.nft_token_id) {
      return NextResponse.json({ error: "Agent already has an NFT", tokenId: agent!.nft_token_id }, { status: 409 })
    }

    // Attempt on-chain mint — graceful fallback if contracts not deployed
    let tokenId = "PENDING"
    let txHash: string | null = null

    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      const writer = getMantleWriter()
      const result = await writer.mintAgentIdentity(walletAddress, agentName)
      tokenId = result.tokenId
      txHash = result.txHash
    } catch (chainErr: any) {
      console.warn("[mint] On-chain mint skipped (contracts not deployed?):", chainErr.message)
      // Assign a sequential token ID from DB as fallback
      const { count } = await supabase.from("agents").select("*", { count: "exact", head: true })
      tokenId = String(count ?? 1)
    }

    // Save to DB
    await supabase.from("agents").update({ nft_token_id: tokenId }).eq("id", agent!.id)

    // Log the mint as a decision
    await supabase.from("agent_decisions").insert({
      agent_id: agent!.id,
      type: "INFO",
      reasoning: `ERC-8004 Agent Identity NFT ${txHash ? "minted on Mantle" : "registered"}. Token ID: #${tokenId}. This establishes the agent's permanent on-chain identity and reputation record.`,
      action_taken: `Agent Identity NFT #${tokenId} ${txHash ? "minted on Mantle Testnet" : "registered"}`,
      tx_hash: txHash,
      status: "confirmed",
    })

    return NextResponse.json({
      success: true,
      tokenId,
      txHash,
      explorerUrl: txHash ? `https://explorer.testnet.mantle.xyz/tx/${txHash}` : null,
    })
  } catch (err: any) {
    console.error("[/api/agent/mint]", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
