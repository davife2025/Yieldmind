import { useQuery } from "@tanstack/react-query"

async function fetchYieldHistory() {
  const res = await fetch("/api/yield")
  if (!res.ok) throw new Error("Failed to fetch yield history")
  return res.json()
}

export function useYieldHistory() {
  return useQuery({
    queryKey: ["yield-history"],
    queryFn: fetchYieldHistory,
    refetchInterval: 60_000,
  })
}
