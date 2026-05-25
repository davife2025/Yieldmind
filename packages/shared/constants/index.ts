// ─────────────────────────────────────────────────────────────
// YieldMind — Shared Constants
// ─────────────────────────────────────────────────────────────

export const APP_NAME = "YieldMind"
export const APP_TAGLINE = "Real assets. Autonomous yield. On-chain proof."

// ── MANTLE NETWORK ─────────────────────────────────────────────────────────

export const MANTLE_TESTNET = {
  id: 5003,
  name: "Mantle Testnet",
  rpcUrl: "https://rpc.testnet.mantle.xyz",
  explorerUrl: "https://explorer.testnet.mantle.xyz",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
} as const

export const MANTLE_MAINNET = {
  id: 5000,
  name: "Mantle",
  rpcUrl: "https://rpc.mantle.xyz",
  explorerUrl: "https://explorer.mantle.xyz",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
} as const

// ── RWA ASSETS ─────────────────────────────────────────────────────────────

export const ASSETS = {
  USDY: {
    id: "USDY" as const,
    name: "USDY",
    fullName: "Ondo US Dollar Yield",
    issuer: "Ondo Finance",
    color: "#00E5CC",
    bgColor: "#00E5CC20",
    type: "stablecoin-yield",
    riskTier: "LOW" as const,
    mantleNative: false,
    description: "Tokenized US Treasury yield-bearing stablecoin",
  },
  mETH: {
    id: "mETH" as const,
    name: "mETH",
    fullName: "Mantle Staked ETH",
    issuer: "Mantle LST",
    color: "#7B61FF",
    bgColor: "#7B61FF20",
    type: "liquid-staking",
    riskTier: "LOW" as const,
    mantleNative: true,
    description: "Mantle's native liquid staking token for ETH",
  },
  USDe: {
    id: "USDe" as const,
    name: "USDe",
    fullName: "Ethena USDe",
    issuer: "Ethena",
    color: "#FF6B35",
    bgColor: "#FF6B3520",
    type: "synthetic-dollar",
    riskTier: "MED" as const,
    mantleNative: false,
    description: "Delta-neutral synthetic dollar with staking yield",
  },
  fBTC: {
    id: "fBTC" as const,
    name: "fBTC",
    fullName: "Mantle fBTC",
    issuer: "Mantle fBTC",
    color: "#F7931A",
    bgColor: "#F7931A20",
    type: "wrapped-btc",
    riskTier: "MED" as const,
    mantleNative: true,
    description: "Mantle-native wrapped Bitcoin with yield layer",
  },
} as const

export type AssetId = keyof typeof ASSETS
export const ASSET_IDS = Object.keys(ASSETS) as AssetId[]

// ── TARGET ALLOCATIONS (AI default) ────────────────────────────────────────

export const DEFAULT_TARGET_ALLOCATIONS: Record<AssetId, number> = {
  USDY: 25,
  mETH: 32,
  USDe: 18,
  fBTC: 25,
}

// ── RISK THRESHOLDS ────────────────────────────────────────────────────────

export const RISK_THRESHOLDS = {
  DRIFT_PCT: 2.5,           // % drift before rebalance triggered
  USDE_FUNDING_RATE: 0.025, // 8h funding rate threshold
  GAS_GWEI: 0.05,           // gas spike threshold
  APY_DROP_PCT: 0.5,        // APY drop % that triggers review
} as const

// ── BYBIT SYMBOLS ──────────────────────────────────────────────────────────

export const BYBIT_SYMBOLS: Partial<Record<AssetId, string>> = {
  mETH: "ETHUSDT",
  fBTC: "BTCUSDT",
}
