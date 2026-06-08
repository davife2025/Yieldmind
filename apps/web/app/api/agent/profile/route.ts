import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// GET /api/agent/profile?wallet=0x...
// Returns full agent profile: DB stats + on-chain data if NFT minted.
// Used by AgentIdentityCard and the /agent page.

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get("wallet") ?? DEMO_WALLET

    const supabase = createServerClient()

    // Select core columns — optional columns (from migration 003) handled with fallback
    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, wallet_address, nft_token_id, name, total_value_usd, weighted_apy, decisions_count, created_at")
      .eq("wallet_address", wallet)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Fetch recent decisions count (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: decisionsToday } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", yesterday)

    // Fetch on-chain profile if NFT is minted
    let onChainProfile = null
    if (agent.nft_token_id) {
      try {
        const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
        const writer = getMantleWriter()
        onChainProfile = await writer.getOnChainProfile(agent.nft_token_id)
      } catch {
        // Contracts not deployed — return DB data only
      }
    }

    // Total on-chain decisions from DecisionLedger
    let totalOnChainDecisions = 0
    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      const writer = getMantleWriter()
      totalOnChainDecisions = await writer.getTotalOnChainDecisions()
    } catch {
      // Contracts not deployed yet — return 0
      totalOnChainDecisions = 0
    }

    return NextResponse.json({
      id:                  agent.id,
      walletAddress:       agent.wallet_address,
      nftTokenId:          agent.nft_token_id,
      name:                agent.name,
      totalValueUsd:       agent.total_value_usd,
      weightedApy:         agent.weighted_apy,
      decisionsCount:      agent.decisions_count,
      decisionsToday:      decisionsToday ?? 0,
      // reputation_score is in migration 003 — falls back to on-chain value or 100
      reputationScore:     onChainProfile?.reputationScore
                             ? Number(onChainProfile.reputationScore)
                             : 100,
      achievementsCount:   0,   // populated from on-chain achievements array in future
      onChainDecisions:    totalOnChainDecisions,
      createdAt:           agent.created_at,
      minted:              !!agent.nft_token_id,
      onChain: onChainProfile ? {
        rebalancesCount:  Number(onChainProfile.rebalancesCount),
        totalYieldEarned: Number(onChainProfile.totalYieldEarned),
        active:           onChainProfile.active,
      } : null,
    })
  } catch (err: unknown) {
    console.error("[/api/agent/profile]", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
