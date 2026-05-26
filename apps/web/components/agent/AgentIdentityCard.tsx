"use client"

import { useState } from "react"
import { BrainCircuit, ExternalLink, Award, Zap, Loader2, CheckCircle } from "lucide-react"
import { formatAddress, formatUSD, formatAPY } from "@yieldmind/shared"
import { Card, SectionHeader, Badge } from "@/components/ui"
import { useWallet } from "@/hooks/useWallet"
import { useQuery } from "@tanstack/react-query"

async function fetchAgentProfile() {
  const res = await fetch("/api/positions")
  if (!res.ok) throw new Error("Failed to fetch agent")
  return res.json()
}

const MOCK_AGENT = {
  name: "YieldMind Agent #1",
  wallet_address: "0xDemoWallet0000000000000000000000000001",
  nft_token_id: null as string | null,
  total_value_usd: 474810,
  weighted_apy: 5.52,
  decisions_count: 24,
}

type MintStatus = "idle" | "minting" | "success" | "error"

export function AgentIdentityCard() {
  const { address, isConnected } = useWallet()
  const [mintStatus, setMintStatus] = useState<MintStatus>("idle")
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null)
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)

  const { data } = useQuery({ queryKey: ["portfolio-stats"], queryFn: fetchAgentProfile })
  const agent = { ...MOCK_AGENT, ...(data ?? {}) }

  const nftTokenId = mintedTokenId ?? agent.nft_token_id
  const minted = !!nftTokenId

  const handleMint = async () => {
    if (!isConnected || !address) {
      setMintError("Connect your wallet first")
      return
    }
    setMintStatus("minting")
    setMintError(null)
    try {
      const res = await fetch("/api/agent/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          agentName: `YieldMind Agent — ${formatAddress(address)}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Mint failed")
      setMintedTokenId(data.tokenId)
      setMintTxHash(data.txHash)
      setMintStatus("success")
    } catch (err: any) {
      setMintError(err.message)
      setMintStatus("error")
    }
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-brand-purple/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-text-primary truncate">{agent.name}</h2>
            <p className="text-xs text-text-muted font-mono">
              {isConnected && address ? formatAddress(address) : formatAddress(agent.wallet_address)}
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
                {minted ? `ERC-8004 NFT · Token #${nftTokenId}` : "ERC-8004 Identity NFT"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {minted ? "On-chain identity active on Mantle" : "Soul-bound identity · Not yet minted"}
              </p>
            </div>
            {minted && mintTxHash && (
              <a
                href={`https://explorer.testnet.mantle.xyz/tx/${mintTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-success hover:text-success/80 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Mint button — only shows if not minted */}
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

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-xl bg-surface-muted">
            <p className="stat-label text-[10px]">Value</p>
            <p className="text-sm font-bold text-text-primary mt-1 tabular-nums">
              {formatUSD(agent.total_value_usd, true)}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-muted">
            <p className="stat-label text-[10px]">APY</p>
            <p className="text-sm font-bold text-brand-cyan mt-1 tabular-nums">
              {formatAPY(agent.weighted_apy)}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-muted">
            <p className="stat-label text-[10px]">Decisions</p>
            <p className="text-sm font-bold text-brand-purple mt-1">
              {agent.decisions_count ?? 0}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
