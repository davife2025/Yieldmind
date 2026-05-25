import { createServerClient } from "@yieldmind/db"
import { RISK_THRESHOLDS } from "@yieldmind/shared"
import type { AssetId } from "@yieldmind/db"
import { getAllAssetPrices, getFundingRateHistory } from "../bybit/client"
import type { RiskSignal } from "../types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Risk Engine
// Detects risk signals across all positions and market conditions
// ─────────────────────────────────────────────────────────────

// ── USDe Funding Rate Risk ─────────────────────────────────────────────────
// USDe yield is delta-neutral but can go negative if funding reverses

async function checkUSDeFundingRisk(): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = []

  const [ethHistory, btcHistory] = await Promise.all([
    getFundingRateHistory("ETHUSDT", 3),
    getFundingRateHistory("BTCUSDT", 3),
  ])

  const latestEth = ethHistory[0]?.fundingRate ?? 0
  const latestBtc = btcHistory[0]?.fundingRate ?? 0

  // Check if funding is spiking (positive extreme — longs paying shorts heavily)
  if (latestEth > RISK_THRESHOLDS.USDE_FUNDING_RATE) {
    signals.push({
      assetId: "USDe",
      type: "FUNDING_RATE",
      severity: latestEth > 0.05 ? "HIGH" : "MED",
      value: latestEth,
      threshold: RISK_THRESHOLDS.USDE_FUNDING_RATE,
      message: `ETH funding rate at ${(latestEth * 100).toFixed(3)}% (8h), above ${(RISK_THRESHOLDS.USDE_FUNDING_RATE * 100).toFixed(3)}% threshold. USDe yield may compress or reverse.`,
      detectedAt: new Date(),
    })
  }

  // Check if funding is deeply negative (USDe yield goes negative)
  if (latestEth < -0.01) {
    signals.push({
      assetId: "USDe",
      type: "FUNDING_RATE",
      severity: "HIGH",
      value: latestEth,
      threshold: -0.01,
      message: `ETH funding rate negative at ${(latestEth * 100).toFixed(3)}% (8h). USDe position at risk of negative yield. Consider reducing exposure.`,
      detectedAt: new Date(),
    })
  }

  // BTC funding check for fBTC
  if (latestBtc < -0.005) {
    signals.push({
      assetId: "fBTC",
      type: "FUNDING_RATE",
      severity: "MED",
      value: latestBtc,
      threshold: -0.005,
      message: `BTC funding rate negative at ${(latestBtc * 100).toFixed(3)}% (8h). Monitor fBTC yield impact.`,
      detectedAt: new Date(),
    })
  }

  return signals
}

// ── Stablecoin Depeg Check ─────────────────────────────────────────────────

async function checkDepegRisk(): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = []
  const prices = await getAllAssetPrices()

  // USDY should be ~$1 ± 0.5%
  // USDe should be ~$1 ± 0.3%
  // Note: In production, fetch actual spot prices for these
  // For now, simulate with slight drift
  const stablecoins: Array<{ id: AssetId; price: number; threshold: number }> = [
    { id: "USDY", price: 1.0 + (Math.random() * 0.004 - 0.002), threshold: 0.005 },
    { id: "USDe", price: 1.0 + (Math.random() * 0.004 - 0.002), threshold: 0.003 },
  ]

  for (const { id, price, threshold } of stablecoins) {
    const depeg = Math.abs(price - 1.0)
    if (depeg > threshold) {
      signals.push({
        assetId: id,
        type: "DEPEG",
        severity: depeg > threshold * 2 ? "CRITICAL" : "HIGH",
        value: price,
        threshold: 1.0 + threshold,
        message: `${id} trading at $${price.toFixed(4)}, deviating ${(depeg * 100).toFixed(3)}% from peg. Immediate review required.`,
        detectedAt: new Date(),
      })
    }
  }

  return signals
}

// ── Portfolio Drift Risk ───────────────────────────────────────────────────

async function checkDriftRisk(agentId: string): Promise<RiskSignal[]> {
  const supabase = createServerClient()
  const signals: RiskSignal[] = []

  const { data: positions } = await supabase
    .from("positions")
    .select("asset_id, allocation_pct, target_allocation_pct, value_usd")
    .eq("agent_id", agentId)

  if (!positions) return signals

  for (const pos of positions) {
    const drift = Math.abs(pos.allocation_pct - pos.target_allocation_pct)
    if (drift > RISK_THRESHOLDS.DRIFT_PCT) {
      signals.push({
        assetId: pos.asset_id as AssetId,
        type: "DRIFT",
        severity: drift > 5 ? "HIGH" : "MED",
        value: drift,
        threshold: RISK_THRESHOLDS.DRIFT_PCT,
        message: `${pos.asset_id} allocation drifted ${drift.toFixed(2)}% from target (${pos.target_allocation_pct.toFixed(1)}% target, ${pos.allocation_pct.toFixed(1)}% actual). Rebalance recommended.`,
        detectedAt: new Date(),
      })
    }
  }

  return signals
}

// ── APY Drop Check ────────────────────────────────────────────────────────

async function checkApyDropRisk(): Promise<RiskSignal[]> {
  const supabase = createServerClient()
  const signals: RiskSignal[] = []

  const assets: AssetId[] = ["USDY", "mETH", "USDe", "fBTC"]

  for (const assetId of assets) {
    const { data: snapshots } = await supabase
      .from("yield_snapshots")
      .select("apy, timestamp")
      .eq("asset_id", assetId)
      .order("timestamp", { ascending: false })
      .limit(4)

    if (!snapshots || snapshots.length < 2) continue

    const current = snapshots[0].apy
    const previous = snapshots[snapshots.length - 1].apy
    const drop = previous - current

    if (drop > RISK_THRESHOLDS.APY_DROP_PCT) {
      signals.push({
        assetId,
        type: "APY_DROP",
        severity: drop > 2 ? "HIGH" : "MED",
        value: drop,
        threshold: RISK_THRESHOLDS.APY_DROP_PCT,
        message: `${assetId} APY dropped ${drop.toFixed(2)}% (${previous.toFixed(2)}% → ${current.toFixed(2)}%). Consider reallocation.`,
        detectedAt: new Date(),
      })
    }
  }

  return signals
}

// ── Store alerts in Supabase ───────────────────────────────────────────────

export async function storeRiskAlerts(
  agentId: string,
  signals: RiskSignal[]
): Promise<void> {
  if (!signals.length) return
  const supabase = createServerClient()

  const { error } = await supabase.from("risk_alerts").insert(
    signals.map((s) => ({
      agent_id: agentId,
      asset_id: s.assetId,
      severity: s.severity,
      title: getRiskTitle(s.type),
      message: s.message,
      resolved: false,
    }))
  )

  if (error) console.error("[RiskEngine] Failed to store alerts:", error.message)
  else console.log(`[RiskEngine] Stored ${signals.length} risk alerts`)
}

function getRiskTitle(type: RiskSignal["type"]): string {
  const titles: Record<RiskSignal["type"], string> = {
    FUNDING_RATE: "Funding Rate Alert",
    DRIFT:        "Portfolio Drift Detected",
    APY_DROP:     "APY Drop Alert",
    GAS_SPIKE:    "Gas Price Spike",
    DEPEG:        "Stablecoin Depeg Warning",
    TVL_DROP:     "TVL Drop Detected",
  }
  return titles[type]
}

// ── Main risk engine run ───────────────────────────────────────────────────

export async function runRiskEngine(agentId: string): Promise<RiskSignal[]> {
  console.log("[RiskEngine] Running risk checks...")

  const [fundingSignals, depegSignals, driftSignals, apySignals] = await Promise.all([
    checkUSDeFundingRisk(),
    checkDepegRisk(),
    checkDriftRisk(agentId),
    checkApyDropRisk(),
  ])

  const allSignals = [...fundingSignals, ...depegSignals, ...driftSignals, ...apySignals]

  console.log(`[RiskEngine] Detected ${allSignals.length} risk signals`)
  return allSignals
}
