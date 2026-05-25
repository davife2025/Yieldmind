"use client"

import { BrainCircuit, ExternalLink, ArrowRightLeft, TrendingUp, ShieldAlert, Info } from "lucide-react"
import { formatTimeAgo, formatTxHash, getMantleExplorerUrl } from "@yieldmind/shared"
import { clsx } from "clsx"

const MOCK_DECISIONS = [
  {
    id: "1",
    type: "REBALANCE" as const,
    reasoning: "Portfolio drift detected: USDY overweight by 1.22% vs target. Shifting 12% of USDY allocation to mETH to capture higher LST yield while maintaining stability floor.",
    action_taken: "Shifted $14,940 USDY → mETH",
    tx_hash: "0x4f2a8c1e3b7d9f0a2c4e6b8d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b7d9f0a",
    status: "confirmed" as const,
    asset_id: "USDY",
    value_delta_usd: 620,
    apy_delta: 0.42,
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    type: "RISK" as const,
    reasoning: "USDe funding rate spike detected: 8-hour rate moved from 0.012% to 0.031%. Elevated funding suggests leveraged long pressure. Reducing USDe exposure by 8% as precautionary measure.",
    action_taken: "Reduced USDe position by $7,136",
    tx_hash: "0x3e1d7a4b9c2f5e8a1d4b7c0f3a6d9e2b5c8f1a4d7b0e3c6f9a2d5b8e1c4f7a0d3",
    status: "confirmed" as const,
    asset_id: "USDe",
    value_delta_usd: -280,
    apy_delta: -0.18,
    created_at: new Date(Date.now() - 51 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    type: "YIELD" as const,
    reasoning: "New mETH staking epoch commenced. APY increased from 4.69% to 4.81% following validator rewards distribution. No action required — current allocation already at target.",
    action_taken: "APY update logged. No rebalance needed.",
    tx_hash: null,
    status: "confirmed" as const,
    asset_id: "mETH",
    value_delta_usd: null,
    apy_delta: 0.12,
    created_at: new Date(Date.now() - 99 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    type: "REBALANCE" as const,
    reasoning: "Minor portfolio drift correction after USDe reduction. fBTC underweight by 1.31% vs target. Allocating recovered capital to fBTC to maintain diversification targets.",
    action_taken: "Shifted $6,200 into fBTC",
    tx_hash: "0x9c8b2d5e1a4f7c0b3e6a9d2c5f8b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b5",
    status: "confirmed" as const,
    asset_id: "fBTC",
    value_delta_usd: 190,
    apy_delta: 0.09,
    created_at: new Date(Date.now() - 126 * 60 * 1000).toISOString(),
  },
]

const TYPE_CONFIG = {
  REBALANCE: { icon: ArrowRightLeft, color: "text-brand-cyan",   bg: "bg-brand-cyan/10",   label: "Rebalance" },
  YIELD:     { icon: TrendingUp,     color: "text-brand-purple", bg: "bg-brand-purple/10", label: "Yield Update" },
  RISK:      { icon: ShieldAlert,    color: "text-warning",      bg: "bg-warning/10",      label: "Risk Action" },
  ALERT:     { icon: ShieldAlert,    color: "text-danger",       bg: "bg-danger/10",       label: "Alert" },
  INFO:      { icon: Info,           color: "text-info",         bg: "bg-info/10",         label: "Info" },
}

export function AgentFeed() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-brand-cyan" />
          <h2 className="text-base font-semibold text-text-primary">Agent Decision Log</h2>
          <span className="flex items-center gap-1 text-xs text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        </div>
        <button className="btn-ghost text-xs">View all</button>
      </div>

      <div className="space-y-3">
        {MOCK_DECISIONS.map((decision) => {
          const cfg = TYPE_CONFIG[decision.type]
          const Icon = cfg.icon
          const positive = (decision.value_delta_usd ?? 0) >= 0

          return (
            <div
              key={decision.id}
              className="flex gap-4 p-4 rounded-xl bg-surface-muted border border-surface-border hover:border-surface-border/80 transition-all group"
            >
              {/* Icon */}
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                <Icon className={clsx("w-4 h-4", cfg.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx("badge text-[11px]",
                      decision.type === "REBALANCE" ? "badge-info" :
                      decision.type === "RISK"      ? "badge-med" :
                      "badge-low"
                    )}>
                      {cfg.label}
                    </span>
                    {decision.asset_id && (
                      <span className="text-xs text-text-muted font-medium">
                        {decision.asset_id}
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {formatTimeAgo(decision.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {decision.tx_hash && (
                      <a
                        href={getMantleExplorerUrl(decision.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-cyan hover:text-brand-cyan/80 mono opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {formatTxHash(decision.tx_hash)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className={clsx(
                      "flex items-center gap-1",
                      decision.status === "confirmed" ? "dot-confirmed" :
                      decision.status === "pending"   ? "dot-pending" : "dot-failed"
                    )} />
                  </div>
                </div>

                {/* AI Reasoning */}
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  {decision.reasoning}
                </p>

                {/* Outcome */}
                {decision.action_taken && (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs font-medium text-text-primary bg-surface-overlay px-2.5 py-1 rounded-lg border border-surface-border">
                      {decision.action_taken}
                    </span>
                    {decision.value_delta_usd !== null && decision.value_delta_usd !== 0 && (
                      <span className={clsx(
                        "text-xs font-semibold",
                        positive ? "text-success" : "text-danger"
                      )}>
                        {positive ? "+" : ""}${Math.abs(decision.value_delta_usd).toFixed(0)} yield impact
                      </span>
                    )}
                    {decision.apy_delta !== null && decision.apy_delta !== 0 && (
                      <span className={clsx(
                        "text-xs font-semibold",
                        decision.apy_delta > 0 ? "text-success" : "text-danger"
                      )}>
                        {decision.apy_delta > 0 ? "+" : ""}{decision.apy_delta.toFixed(2)}% APY
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
