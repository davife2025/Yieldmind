import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// POST /api/agent/mint
// Mints an ERC-8004 Agent Identity NFT for the connected wallet
export async function POST(req: NextRequest) {
  try {
    const { walletAddress, agentName } = await req.json()

    if (!walletAddress || !agentName) {
      return NextResponse.json(
        { error: "walletAddress and agentName are required" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check agent exists in DB
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, nft_token_id, wallet_address")
      .eq("wallet_address", walletAddress)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found in database" }, { status: 404 })
    }

    if (agent.nft_token_id) {
      return NextResponse.json(
        { error: "Agent already has an NFT", tokenId: agent.nft_token_id },
        { status: 409 }
      )
    }

    // Mint on Mantle
    const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
    const writer = getMantleWriter()
    const { tokenId, txHash } = await writer.mintAgentIdentity(walletAddress, agentName)

    // Update Supabase with token ID
    await supabase
      .from("agents")
      .update({ nft_token_id: tokenId })
      .eq("id", agent.id)

    // Write mint decision to log
    await supabase.from("agent_decisions").insert({
      agent_id: agent.id,
      type: "INFO",
      reasoning: `ERC-8004 Agent Identity NFT minted on Mantle. Token ID: #${tokenId}. This establishes the agent's permanent on-chain identity and reputation record.`,
      action_taken: `Minted Agent Identity NFT #${tokenId}`,
      tx_hash: txHash,
      status: "confirmed",
    })

    return NextResponse.json({
      success: true,
      tokenId,
      txHash,
      explorerUrl: `https://explorer.testnet.mantle.xyz/tx/${txHash}`,
    })
  } catch (err: any) {
    console.error("[/api/agent/mint] Error:", err)
    return NextResponse.json(
      { success: false, error: err.message ?? "Mint failed" },
      { status: 500 }
    )
  }
}
