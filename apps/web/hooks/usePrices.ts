import { useQuery } from "@tanstack/react-query"

interface Prices {
  ETH: { price: number; change24h: number; fundingRate: number }
  BTC: { price: number; change24h: number; fundingRate: number }
  fetchedAt: string
  fallback?: boolean
}

async function fetchPrices(): Promise<Prices> {
  const res = await fetch("/api/bybit/prices")
  if (!res.ok) throw new Error("Failed to fetch prices")
  return res.json()
}

export function usePrices() {
  return useQuery({
    queryKey: ["bybit-prices"],
    queryFn: fetchPrices,
    refetchInterval: 30_000,
    staleTime: 25_000,
  })
}
