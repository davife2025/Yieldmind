"use client"

import { useState } from "react"
import { BrainCircuit, ExternalLink, ArrowRightLeft, TrendingUp, ShieldAlert, Info, ChevronDown, ChevronUp } from "lucide-react"
import { formatTimeAgo, formatTxHash, getMantleExplorerUrl } from "@yieldmind/shared"
import { Card, SectionHeader, Badge, LiveIndicator, EmptyState } from "@/components/ui"
import { useRealtimeDecisions } from "@/hooks/useRealtimeDecisions"
import { clsx } from "clsx"

const TYPE_CONFIG = {
  REBALANCE: { icon: ArrowRightLeft, color: "text-brand-cyan",   bg: "bg-brand-cyan/10",   badge: "info"    as const, label: "Rebalance"   },
  YIELD:     { icon: TrendingUp,     color: "text-brand-purple", bg: "bg-brand-purple/10", badge: "low"     as const, label: "Yield Update" },
  RISK:      { icon: ShieldAlert,    color: "text-warning",      bg: "bg-warning/10",      badge: "med"     as const, label: "Risk Action"  },
  ALERT:     { icon: ShieldAlert,    color: "text-danger",       bg: "bg-danger/10",       badge: "high"    as const, label: "Alert"        },
  INFO:      { icon: Info,           color: "text-info",         bg: "bg-info/10",         badge: "neutral" as const, label: "Info"         },
}

const MOCK_DECISIONS = [
  { id: "1", type: "REBALANCE", reasoning: "Portfolio drift detected: USDY overweight by 1.22% vs target. Shifting 12% of USDY allocation to mETH to capture higher LST yield while maintaining stability floor.", action_taken: "Shifted $14,940 USDY → mETH", tx_hash: "0x4f2a8c1e3b7d9f0a2c4e6b8d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b7d9f0a", status: "confirmed", asset_id: "USDY", value_delta_usd: 620, apy_delta: 0.42, created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
  { id: "2", type: "RISK",      reasoning: "USDe funding rate spike detected: 8-hour rate moved from 0.012% to 0.031%. Elevated funding suggests leveraged long pressure. Reducing USDe exposure by 8%.", action_taken: "Reduced USDe position by $7,136", tx_hash: "0x3e1d7a4b9c2f5e8a1d4b7c0f3a6d9e2b5c8f1a4d7b0e3c6f9a2d5b8e1c4f7a0d3", status: "confirmed", asset_id: "USDe", value_delta_usd: -280, apy_delta: -0.18, created_at: new Date(Date.now() - 51 * 60 * 1000).toISOString() },
  { id: "3", type: "YIELD",     reasoning: "New mETH staking epoch commenced. APY increased from 4.69% to 4.81% following validator rewards distribution. No action required — current allocation already at target.", action_taken: "APY update logged. No rebalance needed.", tx_hash: null, status: "confirmed", asset_id: "mETH", value_delta_usd: null, apy_delta: 0.12, created_at: new Date(Date.now() - 99 * 60 * 1000).toISOString() },
  { id: "4", type: "REBALANCE", reasoning: "Minor portfolio drift correction after USDe reduction. fBTC underweight by 1.31% vs target. Allocating recovered capital to fBTC to maintain diversification targets.", action_taken: "Shifted $6,200 into fBTC", tx_hash: "0x9c8b2d5e1a4f7c0b3e6a9d2c5f8b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b5", status: "confirmed", asset_id: "fBTC", value_delta_usd: 190, apy_delta: 0.09, created_at: new Date(Date.now() - 126 * 60 * 1000).toISOString() },
]

function DecisionCard({ decision, isNew }: { decision: any; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = TYPE_CONFIG[decision.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.INFO
  const Icon = cfg.icon
  const positive = (decision.value_delta_usd ?? 0) >= 0

  return (
    <div className={clsx(
      "rounded-xl border transition-all duration-300",
      isNew ? "border-brand-cyan/40 bg-brand-cyan/5 animate-slide-up" : "border-surface-border bg-surface-muted hover:border-surface-border/60"
    )}>
      <div className="flex gap-3 p-4">
        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
          <Icon className={clsx("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
            {decision.asset_id && <span className="text-xs font-mono text-text-muted">{decision.asset_id}</span>}
            <span className="text-xs text-text-muted ml-auto">{formatTimeAgo(decision.created_at)}</span>
            {decision.status === "confirmed" && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{decision.reasoning}</p>
          {decision.action_taken && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-medium text-text-primary bg-surface-overlay px-2.5 py-1 rounded-lg border border-surface-border">{decision.action_taken}</span>
              {decision.value_delta_usd !== null && decision.value_delta_usd !== 0 && (
                <span className={clsx("text-xs font-semibold", positive ? "text-success" : "text-danger")}>
                  {positive ? "+" : ""}${Math.abs(decision.value_delta_usd).toFixed(0)} yield
                </span>
              )}
              {decision.apy_delta !== null && decision.apy_delta !== 0 && (
                <span className={clsx("text-xs font-semibold", (decision.apy_delta ?? 0) > 0 ? "text-success" : "text-danger")}>
                  {(decision.apy_delta ?? 0) > 0 ? "+" : ""}{decision.apy_delta?.toFixed(2)}% APY
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(v => !v)} className="btn-ghost p-1.5 shrink-0 self-start mt-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-border">
          <div className="pt-3 space-y-3">
            <div className="p-3 rounded-xl bg-surface-overlay border border-surface-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">AI Reasoning</p>
              <p className="text-sm text-text-secondary leading-relaxed">{decision.reasoning}</p>
            </div>
            {decision.tx_hash ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-surface-border">
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">On-Chain Proof · Mantle</p>
                  <p className="text-xs font-mono text-text-secondary">{formatTxHash(decision.tx_hash, 10)}</p>
                </div>
                <a href={getMantleExplorerUrl(decision.tx_hash)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan/80 font-medium transition-colors">
                  Verify <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-overlay border border-surface-border">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">On-Chain Status</p>
                <p className="text-xs text-text-muted">Logged in Supabase. On-chain recording active after contract deployment.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AgentFeed({ expanded = false }: { expanded?: boolean }) {
  const { decisions: live, connected } = useRealtimeDecisions({ limit: expanded ? 50 : 10 })
  const decisions = live.length > 0 ? live : MOCK_DECISIONS
  const display = expanded ? decisions : decisions.slice(0, 4)
  const newestId = decisions[0]?.id

  return (
    <Card>
      <SectionHeader
        title="Agent Decision Log"
        subtitle="Every AI decision — reasoning, action, on-chain proof"
        icon={<BrainCircuit className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-3">
            {connected ? <LiveIndicator /> : <span className="text-xs text-text-muted">Connecting...</span>}
            {!expanded && <a href="/agent" className="btn-ghost text-xs">View all</a>}
          </div>
        }
      />
      {decisions.length === 0 ? (
        <EmptyState icon={<BrainCircuit className="w-6 h-6 text-text-muted" />} title="No decisions yet" description="Run the agent to see AI-powered decisions appear here in real time." />
      ) : (
        <div className="space-y-3">
          {(display as any[]).map((d, i) => (
            <DecisionCard key={d.id} decision={d} isNew={i === 0 && d.id === newestId && connected} />
          ))}
        </div>
      )}
      {!expanded && decisions.length > 4 && (
        <div className="mt-4 pt-4 border-t border-surface-border text-center">
          <a href="/agent" className="text-xs text-brand-cyan hover:text-brand-cyan/80 font-medium">View all {decisions.length} decisions →</a>
        </div>
      )}
    </Card>
  )
}
