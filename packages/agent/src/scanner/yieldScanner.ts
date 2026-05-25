import { createServerClient } from "@yieldmind/db"
import { ASSETS, RISK_THRESHOLDS } from "@yieldmind/shared"
import type { AssetId } from "@yieldmind/db"
import { getAllAssetPrices } from "../bybit/client"
import type { AssetYieldData, YieldOpportunity } from "../types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Yield Scanner
// Polls APY for USDY, mETH, USDe, fBTC and detects opportunities
// ─────────────────────────────────────────────────────────────

// Static APY sources (will be replaced with on-chain calls in later sessions)
// These approximate real protocol rates — agent adjusts based on price feed signals

const BASE_APY: Record<AssetId, number> = {
  USDY: 5.20,  // Ondo USDY — T-bill backed, relatively stable
  mETH: 4.75,  // Mantle LST — tracks ETH staking yield + MEV
  USDe: 9.00,  // Ethena — delta-neutral, fluctuates with funding rates
  fBTC: 3.10,  // Mantle fBTC — BTC yield strategies
}

// APY adjustments based on market conditions
function computeDynamicApy(
  assetId: AssetId,
  prices: Awaited<ReturnType<typeof getAllAssetPrices>>
): number {
  const base = BASE_APY[assetId]

  switch (assetId) {
    case "mETH": {
      // ETH price affects staking demand: higher price → more stakers → slightly lower yield
      const ethFactor = prices.ETH > 3500 ? -0.05 : prices.ETH < 3000 ? +0.08 : 0
      // ETH funding rate affects MEV income
      const fundingFactor = (prices.fundingRates.ETHUSDT ?? 0) * 100
      return Math.max(3.5, base + ethFactor + fundingFactor + (Math.random() * 0.1 - 0.05))
    }

    case "USDe": {
      // USDe yield is heavily driven by ETH + BTC funding rates
      const ethFunding = (prices.fundingRates.ETHUSDT ?? 0.01) * 3 * 365 * 100
      const btcFunding = (prices.fundingRates.BTCUSDT ?? 0.01) * 3 * 365 * 100
      const blendedFunding = ethFunding * 0.6 + btcFunding * 0.4
      return Math.max(2, Math.min(25, blendedFunding + 2 + (Math.random() * 0.2 - 0.1)))
    }

    case "fBTC": {
      // BTC yield influenced by funding and BTC price momentum
      const btcFactor = prices.BTC > 65000 ? +0.15 : prices.BTC < 55000 ? -0.10 : 0
      return Math.max(2, base + btcFactor + (Math.random() * 0.08 - 0.04))
    }

    case "USDY":
      // T-bill backed — very stable, minor drift
      return Math.max(4.5, base + (Math.random() * 0.06 - 0.03))

    default:
      return base
  }
}

// ── Fetch yield for all assets ─────────────────────────────────────────────

export async function fetchAllYields(): Promise<AssetYieldData[]> {
  const prices = await getAllAssetPrices()
  const now = new Date()

  return (Object.keys(ASSETS) as AssetId[]).map((assetId) => ({
    assetId,
    apy: +computeDynamicApy(assetId, prices).toFixed(4),
    priceUsd: assetId === "mETH"
      ? prices.ETH
      : assetId === "fBTC"
      ? prices.BTC
      : 1.0,
    source: ASSETS[assetId].issuer.toLowerCase().replace(" ", "-"),
    fetchedAt: now,
  }))
}

// ── Store yield snapshots in Supabase ──────────────────────────────────────

export async function storeYieldSnapshots(yields: AssetYieldData[]): Promise<void> {
  const supabase = createServerClient()

  const { error } = await supabase.from("yield_snapshots").insert(
    yields.map((y) => ({
      asset_id: y.assetId,
      apy: y.apy,
      price_usd: y.priceUsd,
      source: y.source,
      timestamp: y.fetchedAt.toISOString(),
    }))
  )

  if (error) {
    console.error("[YieldScanner] Failed to store snapshots:", error.message)
  } else {
    console.log(`[YieldScanner] Stored ${yields.length} yield snapshots`)
  }
}

// ── Detect yield opportunities vs previous snapshot ───────────────────────

export async function detectYieldOpportunities(
  currentYields: AssetYieldData[]
): Promise<YieldOpportunity[]> {
  const supabase = createServerClient()
  const opportunities: YieldOpportunity[] = []

  for (const current of currentYields) {
    // Get the previous snapshot for this asset
    const { data: prev } = await supabase
      .from("yield_snapshots")
      .select("apy")
      .eq("asset_id", current.assetId)
      .order("timestamp", { ascending: false })
      .limit(2)

    const previousApy = prev?.[1]?.apy ?? prev?.[0]?.apy ?? current.apy
    const delta = current.apy - previousApy
    const absDelta = Math.abs(delta)

    if (absDelta < 0.01) continue // Too small to act on

    const significance =
      absDelta >= 0.5 ? "MAJOR" :
      absDelta >= 0.2 ? "NOTABLE" :
      "MINOR"

    opportunities.push({
      assetId: current.assetId,
      currentApy: current.apy,
      previousApy,
      delta,
      direction: delta > 0 ? "UP" : "DOWN",
      significance,
      detectedAt: new Date(),
    })
  }

  return opportunities
}

// ── Detect portfolio drift ─────────────────────────────────────────────────

export async function detectPortfolioDrift(agentId: string) {
  const supabase = createServerClient()

  const { data: positions } = await supabase
    .from("positions")
    .select("asset_id, allocation_pct, target_allocation_pct, value_usd")
    .eq("agent_id", agentId)

  if (!positions?.length) return []

  return positions
    .map((p) => ({
      assetId: p.asset_id as AssetId,
      drift: p.allocation_pct - p.target_allocation_pct,
      valueUsd: p.value_usd,
    }))
    .filter((p) => Math.abs(p.drift) > RISK_THRESHOLDS.DRIFT_PCT)
}
