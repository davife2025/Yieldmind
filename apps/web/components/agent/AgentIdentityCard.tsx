"use client"

import { useState } from "react"
import { BrainCircuit, ExternalLink, Award, Zap, Loader2, CheckCircle, Star } from "lucide-react"
import { formatAddress, formatUSD, formatAPY } from "@yieldmind/shared"
import { Card, Badge, Skeleton } from "@/components/ui"
import { useWallet } from "@/hooks/useWallet"
import { useAgentProfile } from "@/hooks/useAgentProfile"
import { useQueryClient } from "@tanstack/react-query"

type MintStatus = "idle" | "minting" | "success" | "error"

export function AgentIdentityCard() {
  const { address, isConnected }        = useWallet()
  const { data: profile, isLoading }    = useAgentProfile()
  const queryClient                     = useQueryClient()
  const [mintStatus, setMintStatus]     = useState<MintStatus>("idle")
  const [mintTxHash, setMintTxHash]     = useState<string | null>(null)
  const [mintError, setMintError]       = useState<string | null>(null)

  const handleMint = async () => {
    if (!isConnected || !address) {
      setMintError("Connect your wallet first")
      return
    }
    setMintStatus("minting")
    setMintError(null)
    try {
      const res  = await fetch("/api/agent/mint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          walletAddress: address,
          agentName:     `YieldMind Agent — ${formatAddress(address)}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Mint failed")
      setMintTxHash(data.txHash)
      setMintStatus("success")
      // Refresh profile to show new token ID
      queryClient.invalidateQueries({ queryKey: ["agent-profile"] })
    } catch (err: unknown) {
      setMintError(err instanceof Error ? err.message : String(err))
      setMintStatus("error")
    }
  }

  const minted     = profile?.minted || mintStatus === "success"
  const tokenId    = profile?.nftTokenId
  const reputation = profile?.reputationScore ?? 100

  // Reputation tier
  const repTier =
    reputation >= 800 ? { label: "Elite",    color: "text-brand-gold",   bg: "bg-brand-gold/10"   } :
    reputation >= 500 ? { label: "Trusted",  color: "text-brand-cyan",   bg: "bg-brand-cyan/10"   } :
    reputation >= 200 ? { label: "Active",   color: "text-brand-purple", bg: "bg-brand-purple/10" } :
                        { label: "New",      color: "text-text-muted",   bg: "bg-surface-muted"   }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-brand-purple/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {isLoading
              ? <Skeleton className="h-5 w-36 mb-1" />
              : <h2 className="text-base font-bold text-text-primary truncate">{profile?.name ?? "YieldMind Agent"}</h2>
            }
            <p className="text-xs text-text-muted font-mono">
              {isConnected && address ? formatAddress(address) : "0xDemo...0001"}
            </p>
          </div>
          {minted && <Badge variant="low" dot>Active</Badge>}
        </div>

        {/* ERC-8004 NFT status */}
        <div className={`p-3 rounded-xl mb-4 border ${
          minted
            ? "bg-success/5 border-success/20"
            : "bg-surface-muted border-surface-border border-dashed"
        }`}>
          <div className="flex items-center gap-2">
            <Award className={`w-4 h-4 shrink-0 ${minted ? "text-success" : "text-text-muted"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary">
                {minted
                  ? `ERC-8004 NFT · Token #${tokenId}`
                  : "ERC-8004 Identity NFT"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {minted
                  ? "Soul-bound · On-chain identity active on Mantle"
                  : "Not yet minted · Required for on-chain reputation"}
              </p>
            </div>
            {minted && (mintTxHash || tokenId) && (
              <a
                href={mintTxHash
                  ? `https://explorer.testnet.mantle.xyz/tx/${mintTxHash}`
                  : `https://explorer.testnet.mantle.xyz`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-success hover:text-success/80 shrink-0 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {!minted && (
            <div className="mt-3 space-y-2">
              <button
                onClick={handleMint}
                disabled={mintStatus === "minting" || !isConnected}
                className="btn-secondary w-full justify-center text-xs py-2"
              >
                {mintStatus === "minting" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Minting on Mantle...</>
                ) : mintStatus === "success" ? (
                  <><CheckCircle className="w-3.5 h-3.5 text-success" /> Minted!</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> {isConnected ? "Mint Agent Identity" : "Connect wallet to mint"}</>
                )}
              </button>
              {mintError && (
                <p className="text-[11px] text-danger text-center">{mintError}</p>
              )}
            </div>
          )}
        </div>

        {/* Reputation bar */}
        {minted && (
          <div className="mb-4 p-3 rounded-xl bg-surface-muted border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Star className={`w-3.5 h-3.5 ${repTier.color}`} />
                <span className="text-xs font-semibold text-text-primary">Reputation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${repTier.color}`}>{reputation}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${repTier.bg} ${repTier.color}`}>
                  {repTier.label}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple transition-all duration-500"
                style={{ width: `${Math.min(reputation / 10, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 text-right">{reputation} / 1000</p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))
          ) : (
            <>
              <div className="text-center p-3 rounded-xl bg-surface-muted">
                <p className="stat-label text-[10px]">Value</p>
                <p className="text-sm font-bold text-text-primary mt-1 tabular-nums">
                  {formatUSD(profile?.totalValueUsd ?? 474810, true)}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-surface-muted">
                <p className="stat-label text-[10px]">APY</p>
                <p className="text-sm font-bold text-brand-cyan mt-1 tabular-nums">
                  {formatAPY(profile?.weightedApy ?? 5.52)}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-surface-muted">
                <p className="stat-label text-[10px]">Decisions</p>
                <p className="text-sm font-bold text-brand-purple mt-1">
                  {profile?.decisionsCount ?? 24}
                </p>
              </div>
            </>
          )}
        </div>

        {/* On-chain decision count (only shown if contracts deployed) */}
        {profile?.onChainDecisions !== undefined && profile.onChainDecisions > 0 && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20">
            <span className="text-xs text-text-secondary">On-chain decisions</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-brand-cyan">{profile.onChainDecisions}</span>
              <a
                href="https://explorer.testnet.mantle.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-cyan/60 hover:text-brand-cyan transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
