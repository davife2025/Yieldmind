import { createServerClient } from "@yieldmind/db"
import type { AssetId } from "@yieldmind/db"
import type { PortfolioSnapshot } from "../types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Portfolio State
// Loads current portfolio snapshot for AI reasoning context
// ─────────────────────────────────────────────────────────────

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

export async function loadPortfolioSnapshot(): Promise<PortfolioSnapshot | null> {
  const supabase = createServerClient()

  // Load agent
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, total_value_usd, weighted_apy")
    .eq("wallet_address", DEMO_WALLET)
    .single()

  if (agentError || !agent) {
    console.error("[Portfolio] Agent not found:", agentError?.message)
    return null
  }

  // Load positions with latest APY
  const { data: positions } = await supabase
    .from("positions")
    .select("asset_id, balance, value_usd, allocation_pct, target_allocation_pct")
    .eq("agent_id", agent.id)

  if (!positions) return null

  // Get latest APY per asset
  const assetIds = positions.map((p) => p.asset_id)
  const { data: snapshots } = await supabase
    .from("yield_snapshots")
    .select("asset_id, apy")
    .in("asset_id", assetIds)
    .order("timestamp", { ascending: false })
    .limit(assetIds.length * 2)

  const latestApy: Record<string, number> = {}
  snapshots?.forEach((s) => {
    if (!latestApy[s.asset_id]) latestApy[s.asset_id] = s.apy
  })

  return {
    agentId: agent.id,
    totalValueUsd: agent.total_value_usd,
    weightedApy: agent.weighted_apy,
    fetchedAt: new Date(),
    positions: positions.map((p) => ({
      assetId: p.asset_id as AssetId,
      balance: p.balance,
      valueUsd: p.value_usd,
      allocationPct: p.allocation_pct,
      targetAllocationPct: p.target_allocation_pct,
      apy: latestApy[p.asset_id] ?? 0,
    })),
  }
}

export async function updatePortfolioStats(
  agentId: string,
  totalValueUsd: number,
  weightedApy: number
): Promise<void> {
  const supabase = createServerClient()
  await supabase
    .from("agents")
    .update({ total_value_usd: totalValueUsd, weighted_apy: weightedApy })
    .eq("id", agentId)
}
