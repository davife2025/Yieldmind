import { useQuery } from "@tanstack/react-query"
import type { AgentDecision } from "@yieldmind/db"

async function fetchDecisions(limit = 20): Promise<AgentDecision[]> {
  const res = await fetch(`/api/agent/decisions?limit=${limit}`)
  if (!res.ok) throw new Error("Failed to fetch decisions")
  const data = await res.json()
  return data.decisions ?? []
}

export function useAgentDecisions(limit = 20) {
  return useQuery({
    queryKey: ["agent-decisions", limit],
    queryFn: () => fetchDecisions(limit),
    refetchInterval: 30_000,
  })
}
