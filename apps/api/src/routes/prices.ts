import { Router, type Request, type Response } from "express"

const router = Router()

// ── GET /api/v1/prices ─────────────────────────────────────────────────────
// Live ETH + BTC prices from Bybit with funding rates.
// Cached in-memory for 30s to avoid hammering the Bybit API.

interface PriceCache {
  data: PriceResponse
  cachedAt: number
}

interface PriceResponse {
  ETH:       { price: number; change24h: number; fundingRate: number }
  BTC:       { price: number; change24h: number; fundingRate: number }
  fetchedAt: string
  fallback?: boolean
}

let cache: PriceCache | null = null
const CACHE_TTL_MS = 30_000

router.get("/", async (_req: Request, res: Response) => {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return res.json(cache.data)
  }

  try {
    const { getTicker, getFundingRateHistory } = await import(
      "@yieldmind/agent/src/bybit/client"
    )

    const [ethTicker, btcTicker, ethFunding, btcFunding] = await Promise.all([
      getTicker("ETHUSDT"),
      getTicker("BTCUSDT"),
      getFundingRateHistory("ETHUSDT", 1),
      getFundingRateHistory("BTCUSDT", 1),
    ])

    const data: PriceResponse = {
      ETH: {
        price:       ethTicker?.lastPrice   ?? 3524.10,
        change24h:   ethTicker?.price24hPcnt ?? 0,
        fundingRate: ethFunding[0]?.fundingRate ?? 0.0001,
      },
      BTC: {
        price:       btcTicker?.lastPrice   ?? 61130.00,
        change24h:   btcTicker?.price24hPcnt ?? 0,
        fundingRate: btcFunding[0]?.fundingRate ?? 0.0001,
      },
      fetchedAt: new Date().toISOString(),
    }

    cache = { data, cachedAt: Date.now() }
    return res.json(data)
  } catch (err: unknown) {
    console.error("[prices]", err instanceof Error ? err.message : String(err))
    const fallback: PriceResponse = {
      ETH:       { price: 3524.10, change24h: 0, fundingRate: 0.0001 },
      BTC:       { price: 61130.00, change24h: 0, fundingRate: 0.0001 },
      fetchedAt: new Date().toISOString(),
      fallback:  true,
    }
    cache = { data: fallback, cachedAt: Date.now() }
    return res.json(fallback)
  }
})

export default router
