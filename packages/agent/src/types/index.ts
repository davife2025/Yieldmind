import type { AssetId, DecisionType, DecisionStatus, AlertSeverity } from "@yieldmind/db"

// ─────────────────────────────────────────────────────────────
// YieldMind Agent — Internal Types
// ─────────────────────────────────────────────────────────────

export interface AssetYieldData {
  assetId: AssetId
  apy: number
  priceUsd: number
  tvlUsd?: number
  source: string
  fetchedAt: Date
}

export interface PortfolioSnapshot {
  agentId: string
  totalValueUsd: number
  weightedApy: number
  positions: PositionSnapshot[]
  fetchedAt: Date
}

export interface PositionSnapshot {
  assetId: AssetId
  balance: number
  valueUsd: number
  allocationPct: number
  targetAllocationPct: number
  apy: number
}

export interface RiskSignal {
  assetId: AssetId | null
  type: "FUNDING_RATE" | "DRIFT" | "APY_DROP" | "GAS_SPIKE" | "DEPEG" | "TVL_DROP"
  severity: AlertSeverity
  value: number
  threshold: number
  message: string
  detectedAt: Date
}

export interface YieldOpportunity {
  assetId: AssetId
  currentApy: number
  previousApy: number
  delta: number
  direction: "UP" | "DOWN"
  significance: "MINOR" | "NOTABLE" | "MAJOR"
  detectedAt: Date
}

export interface AgentDecisionPayload {
  agentId: string
  type: DecisionType
  reasoning: string
  actionTaken?: string
  txHash?: string
  status: DecisionStatus
  assetId?: AssetId
  valueDeltaUsd?: number
  apyDelta?: number
}

export interface RebalanceAction {
  fromAsset: AssetId
  toAsset: AssetId
  amountUsd: number
  reasoning: string
  expectedApyDelta: number
}

export interface AgentRunResult {
  agentId: string
  ranAt: Date
  yieldOpportunities: YieldOpportunity[]
  riskSignals: RiskSignal[]
  decisionsWritten: number
  rebalancesTriggered: number
  errors: string[]
}
