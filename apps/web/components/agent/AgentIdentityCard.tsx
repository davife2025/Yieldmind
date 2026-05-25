"use client"

import { BrainCircuit, ExternalLink, Award, Zap } from "lucide-react"
import { formatAddress, formatUSD, formatAPY } from "@yieldmind/shared"

const MOCK_AGENT = {
  name: "YieldMind Agent #1",
  wallet_address: "0xDemoWallet0000000000000000000000000001",
  nft_token_id: null, // null until minted in Session 3
  total_value_usd: 474810,
  weighted_apy: 5.52,
  decisions_count: 24,
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
}

export function AgentIdentityCard() {
  const agent = MOCK_AGENT
  const minted = !!agent.nft_token_id

  return (
    <div className="card relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-brand-purple/5 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">{agent.name}</h2>
              <p className="text-xs text-text-muted font-mono">
                {formatAddress(agent.wallet_address)}
              </p>
            </div>
          </div>
        </div>

        {/* ERC-8004 NFT status */}
        <div className={`p-3 rounded-xl mb-4 border ${
          minted
            ? "bg-success/5 border-success/20"
            : "bg-surface-muted border-surface-border border-dashed"
        }`}>
          <div className="flex items-center gap-2">
            <Award className={`w-4 h-4 ${minted ? "text-success" : "text-text-muted"}`} />
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {minted ? `ERC-8004 NFT · Token #${agent.nft_token_id}` : "ERC-8004 Identity NFT"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {minted
                  ? "On-chain identity active"
                  : "Mint in Session 3 · Mantle testnet"}
              </p>
            </div>
            {minted && (
              <a
                href="#"
                className="ml-auto text-success hover:text-success/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {!minted && (
            <button className="btn-secondary w-full mt-3 text-xs justify-center">
              <Zap className="w-3.5 h-3.5" />
              Mint Agent Identity
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-surface-muted">
            <p className="stat-label text-[10px]">Value</p>
            <p className="text-sm font-bold text-text-primary mt-1">
              {formatUSD(agent.total_value_usd, true)}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-muted">
            <p className="stat-label text-[10px]">APY</p>
            <p className="text-sm font-bold text-brand-cyan mt-1">
              {formatAPY(agent.weighted_apy)}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-surface-muted">
            <p className="stat-label text-[10px]">Decisions</p>
            <p className="text-sm font-bold text-brand-purple mt-1">
              {agent.decisions_count}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
