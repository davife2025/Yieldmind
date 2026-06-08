import { useQuery } from "@tanstack/react-query"

export interface AgentStatus {
  status:              "active" | "overdue" | "unknown"
  lastRunAt:           string | null
  nextRunAt:           string | null
  pollIntervalMinutes: number
  model:               string
  network:             string
  chainId:             number
  decisions: {
    total:    number
    last24h:  number
    lastHour: number
  }
  activeAlerts: number
  error?: string
}

async function fetchAgentStatus(): Promise<AgentStatus> {
  const res = await fetch("/api/agent/status")
  if (!res.ok) throw new Error("Failed to fetch agent status")
  return res.json()
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ["agent-status"],
    queryFn:  fetchAgentStatus,
    refetchInterval: 30_000,
    staleTime:       25_000,
  })
}
