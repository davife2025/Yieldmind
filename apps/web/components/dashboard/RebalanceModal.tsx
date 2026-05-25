"use client"

import { useState } from "react"
import { ArrowRight, ArrowRightLeft, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { formatUSD, formatPct, getMantleExplorerUrl } from "@yieldmind/shared"
import { ASSETS } from "@yieldmind/shared"
import { Badge, AssetChip } from "@/components/ui"
import { clsx } from "clsx"

interface RebalanceSuggestion {
  fromAsset: string
  toAsset:   string
  amountUsd: number
  reasoning: string
  expectedApyDelta: number
  expectedValueDelta: number
}

const MOCK_SUGGESTION: RebalanceSuggestion = {
  fromAsset: "USDY",
  toAsset: "mETH",
  amountUsd: 14940,
  reasoning: "USDY is overweight by 1.22% vs target allocation of 25%. mETH APY (4.81%) currently exceeds USDY (5.23%) adjusted for risk weighting. Shifting restores balance while capturing increased LST yield from the new staking epoch.",
  expectedApyDelta: 0.42,
  expectedValueDelta: 620,
}

type Status = "idle" | "approving" | "success" | "error"

interface RebalanceModalProps {
  suggestion?: RebalanceSuggestion
  onClose: () => void
}

export function RebalanceModal({ suggestion = MOCK_SUGGESTION, onClose }: RebalanceModalProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fromAsset = ASSETS[suggestion.fromAsset as keyof typeof ASSETS]
  const toAsset   = ASSETS[suggestion.toAsset   as keyof typeof ASSETS]

  const handleApprove = async () => {
    setStatus("approving")
    try {
      // In production: call /api/agent/rebalance which executes on Mantle
      await new Promise((r) => setTimeout(r, 2000))
      setTxHash("0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""))
      setStatus("success")
    } catch (err: any) {
      setError(err.message ?? "Rebalance failed")
      setStatus("error")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-raised border border-surface-border rounded-2xl shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-brand-cyan" />
            <h2 className="text-base font-bold text-text-primary">Rebalance Suggestion</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Trade visualisation */}
          <div className="flex items-center gap-3">
            {/* From */}
            <div className="flex-1 p-4 rounded-xl bg-surface-muted border border-surface-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">From</p>
              <div className="flex items-center gap-2 mb-2">
                <AssetChip assetId={suggestion.fromAsset} />
                <span className="font-bold text-text-primary">{fromAsset?.name}</span>
              </div>
              <p className="text-lg font-bold text-text-primary">{formatUSD(suggestion.amountUsd)}</p>
              <p className="text-xs text-text-muted mt-0.5">{fromAsset?.issuer}</p>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-8 h-8 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-brand-cyan" />
              </div>
            </div>

            {/* To */}
            <div className="flex-1 p-4 rounded-xl bg-surface-muted border border-surface-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">To</p>
              <div className="flex items-center gap-2 mb-2">
                <AssetChip assetId={suggestion.toAsset} />
                <span className="font-bold text-text-primary">{toAsset?.name}</span>
              </div>
              <p className="text-lg font-bold text-text-primary">{formatUSD(suggestion.amountUsd)}</p>
              <p className="text-xs text-text-muted mt-0.5">{toAsset?.issuer}</p>
            </div>
          </div>

          {/* Expected impact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-success/5 border border-success/20 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">APY Impact</p>
              <p className="text-base font-bold text-success">+{suggestion.expectedApyDelta.toFixed(2)}%</p>
            </div>
            <div className="p-3 rounded-xl bg-success/5 border border-success/20 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Yield Gain</p>
              <p className="text-base font-bold text-success">+{formatUSD(suggestion.expectedValueDelta)}</p>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="p-3 rounded-xl bg-surface-muted border border-surface-border">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">AI Reasoning</p>
            <p className="text-xs text-text-secondary leading-relaxed">{suggestion.reasoning}</p>
          </div>

          {/* Network info */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Transaction will be executed on <strong className="text-text-primary">Mantle Testnet</strong> and recorded via ERC-8004.</span>
          </div>

          {/* Success state */}
          {status === "success" && txHash && (
            <div className="p-3 rounded-xl bg-success/5 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-success">Rebalance Executed</span>
              </div>
              <a
                href={getMantleExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                {txHash.slice(0, 20)}...{txHash.slice(-6)} ↗
              </a>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          {status === "success" ? (
            <button onClick={onClose} className="btn-primary flex-1 justify-center">Done</button>
          ) : (
            <>
              <button onClick={onClose} disabled={status === "approving"} className="btn-secondary flex-1 justify-center">
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={status === "approving"}
                className="btn-primary flex-1 justify-center"
              >
                {status === "approving"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Executing...</>
                  : <><CheckCircle className="w-4 h-4" /> Approve</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
