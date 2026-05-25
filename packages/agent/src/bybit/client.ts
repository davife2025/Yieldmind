import axios from "axios"
import crypto from "crypto"

// ─────────────────────────────────────────────────────────────
// YieldMind — Bybit REST API Client
// Handles signed + unsigned requests for price feeds
// ─────────────────────────────────────────────────────────────

const BASE_URL = process.env.BYBIT_BASE_URL ?? "https://api-testnet.bybit.com"
const API_KEY = process.env.BYBIT_API_KEY ?? ""
const API_SECRET = process.env.BYBIT_API_SECRET ?? ""

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
})

// ── Signature helper ───────────────────────────────────────────────────────

function sign(params: Record<string, string | number>, timestamp: number): string {
  const queryString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")

  const payload = `${timestamp}${API_KEY}5000${queryString}`
  return crypto.createHmac("sha256", API_SECRET).update(payload).digest("hex")
}

// ── Public market data (no auth needed) ───────────────────────────────────

export interface Ticker {
  symbol: string
  lastPrice: number
  price24hPcnt: number
  highPrice24h: number
  lowPrice24h: number
  volume24h: number
  fundingRate?: number
  nextFundingTime?: number
}

export async function getTicker(symbol: string): Promise<Ticker | null> {
  try {
    const res = await client.get("/v5/market/tickers", {
      params: { category: "linear", symbol },
    })
    const item = res.data?.result?.list?.[0]
    if (!item) return null

    return {
      symbol: item.symbol,
      lastPrice: parseFloat(item.lastPrice),
      price24hPcnt: parseFloat(item.price24hPcnt),
      highPrice24h: parseFloat(item.highPrice24h),
      lowPrice24h: parseFloat(item.lowPrice24h),
      volume24h: parseFloat(item.volume24h),
      fundingRate: item.fundingRate ? parseFloat(item.fundingRate) : undefined,
      nextFundingTime: item.nextFundingTime ? parseInt(item.nextFundingTime) : undefined,
    }
  } catch (err) {
    console.error(`[Bybit] Failed to fetch ticker for ${symbol}:`, err)
    return null
  }
}

export async function getMultipleTickers(symbols: string[]): Promise<Record<string, Ticker>> {
  const results: Record<string, Ticker> = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      const ticker = await getTicker(symbol)
      if (ticker) results[symbol] = ticker
    })
  )
  return results
}

// ── Funding rate history ───────────────────────────────────────────────────

export interface FundingRate {
  symbol: string
  fundingRate: number
  fundingRateTimestamp: number
}

export async function getFundingRateHistory(
  symbol: string,
  limit = 8
): Promise<FundingRate[]> {
  try {
    const res = await client.get("/v5/market/funding/history", {
      params: { category: "linear", symbol, limit },
    })
    return (res.data?.result?.list ?? []).map((item: any) => ({
      symbol: item.symbol,
      fundingRate: parseFloat(item.fundingRate),
      fundingRateTimestamp: parseInt(item.fundingRateTimestamp),
    }))
  } catch (err) {
    console.error(`[Bybit] Failed to fetch funding rate for ${symbol}:`, err)
    return []
  }
}

// ── Spot price (USDY, stablecoins) ────────────────────────────────────────

export async function getSpotPrice(symbol: string): Promise<number | null> {
  try {
    const res = await client.get("/v5/market/tickers", {
      params: { category: "spot", symbol },
    })
    const item = res.data?.result?.list?.[0]
    return item ? parseFloat(item.lastPrice) : null
  } catch {
    return null
  }
}

// ── Aggregate: all YieldMind asset prices ─────────────────────────────────

export interface AssetPrices {
  ETH: number
  BTC: number
  fundingRates: {
    ETHUSDT: number | null
    BTCUSDT: number | null
  }
}

export async function getAllAssetPrices(): Promise<AssetPrices> {
  const [ethTicker, btcTicker, ethFunding, btcFunding] = await Promise.all([
    getTicker("ETHUSDT"),
    getTicker("BTCUSDT"),
    getFundingRateHistory("ETHUSDT", 1),
    getFundingRateHistory("BTCUSDT", 1),
  ])

  return {
    ETH: ethTicker?.lastPrice ?? 3524.10,
    BTC: btcTicker?.lastPrice ?? 61130.00,
    fundingRates: {
      ETHUSDT: ethFunding[0]?.fundingRate ?? null,
      BTCUSDT: btcFunding[0]?.fundingRate ?? null,
    },
  }
}
