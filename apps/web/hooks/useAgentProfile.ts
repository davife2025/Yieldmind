import { useQuery } from "@tanstack/react-query"
import { useWallet } from "./useWallet"

export interface AgentProfile {
  id:                string
  walletAddress:     string
  nftTokenId:        string | null
  name:              string
  totalValueUsd:     number
  weightedApy:       number
  decisionsCount:    number
  decisionsToday:    number
  reputationScore:   number
  achievementsCount: number
  onChainDecisions:  number
  createdAt:         string
  minted:            boolean
  onChain: {
    rebalancesCount:  number
    totalYieldEarned: number
    active:           boolean
  } | null
}

async function fetchProfile(wallet: string): Promise<AgentProfile> {
  const res = await fetch(`/api/agent/profile?wallet=${encodeURIComponent(wallet)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? "Failed to fetch agent profile")
  }
  return res.json()
}

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

export function useAgentProfile() {
  const { address, isConnected } = useWallet()
  // Use connected wallet if available, else fall back to demo wallet
  const wallet = isConnected && address ? address : DEMO_WALLET

  return useQuery({
    queryKey:  ["agent-profile", wallet],
    queryFn:   () => fetchProfile(wallet),
    refetchInterval: 60_000,
    staleTime:       30_000,
  })
}
