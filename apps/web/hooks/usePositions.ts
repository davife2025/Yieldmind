import { useQuery } from "@tanstack/react-query"
import type { AssetId } from "@yieldmind/db"

interface PositionRow {
  asset_id: AssetId
  balance: number
  value_usd: number
  allocation_pct: number
  target_allocation_pct: number
  apy: number
  trend: number
}

async function fetchPositions(): Promise<PositionRow[]> {
  const res = await fetch("/api/positions/list")
  if (!res.ok) throw new Error("Failed to fetch positions")
  return res.json()
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: fetchPositions,
    refetchInterval: 30_000,
  })
}
