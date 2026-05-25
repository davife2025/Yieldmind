// ─────────────────────────────────────────────────────────────
// YieldMind — Shared Utilities
// ─────────────────────────────────────────────────────────────

// ── FORMATTING ─────────────────────────────────────────────────────────────

export const formatUSD = (value: number, compact = false): string => {
  if (compact && value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (compact && value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatAPY = (apy: number): string => `${apy.toFixed(2)}%`

export const formatPct = (pct: number, showSign = false): string => {
  const sign = showSign && pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

export const formatTxHash = (hash: string, chars = 6): string =>
  `${hash.slice(0, chars)}...${hash.slice(-4)}`

export const formatAddress = (address: string): string =>
  `${address.slice(0, 6)}...${address.slice(-4)}`

export const formatTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const formatTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

// ── MATH ───────────────────────────────────────────────────────────────────

export const calcWeightedAPY = (
  positions: { value_usd: number; apy: number }[]
): number => {
  const totalValue = positions.reduce((sum, p) => sum + p.value_usd, 0)
  if (totalValue === 0) return 0
  return positions.reduce((sum, p) => sum + (p.value_usd / totalValue) * p.apy, 0)
}

export const calcDrift = (actual: number, target: number): number =>
  Math.abs(actual - target)

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

// ── MANTLE EXPLORER ────────────────────────────────────────────────────────

export const getMantleExplorerUrl = (
  txHash: string,
  testnet = true
): string => {
  const base = testnet
    ? "https://explorer.testnet.mantle.xyz"
    : "https://explorer.mantle.xyz"
  return `${base}/tx/${txHash}`
}
