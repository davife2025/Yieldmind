import { useQuery } from "@tanstack/react-query"

interface PortfolioStats {
  totalValue: number
  weightedApy: number
  dailyYield: number
  decisionsToday: number
  totalChange24h: number
}

async function fetchPortfolioStats(): Promise<PortfolioStats> {
  const res = await fetch("/api/positions")
  if (!res.ok) throw new Error("Failed to fetch portfolio stats")
  return res.json()
}

export function usePortfolioStats() {
  return useQuery({
    queryKey: ["portfolio-stats"],
    queryFn: fetchPortfolioStats,
    refetchInterval: 30_000,
  })
}
