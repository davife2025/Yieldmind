"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { formatUSD, formatAPY, formatPct } from "@yieldmind/shared"
import { ASSETS } from "@yieldmind/shared"
import { usePositions } from "@/hooks/usePositions"
import { RebalanceModal } from "@/components/dashboard/RebalanceModal"
import { SectionHeader, Badge, AssetChip, Skeleton } from "@/components/ui"
import { clsx } from "clsx"

const MOCK_POSITIONS = [
  { asset_id: "USDY" as const, balance: 124500, value_usd: 124500, allocation_pct: 26.22, target_allocation_pct: 25, apy: 5.23, trend: +0.04 },
  { asset_id: "mETH" as const, balance: 42.18,  value_usd: 148630, allocation_pct: 31.30, target_allocation_pct: 32, apy: 4.81, trend: +0.11 },
  { asset_id: "USDe" as const, balance: 89200,  value_usd: 89200,  allocation_pct: 18.79, target_allocation_pct: 18, apy: 8.94, trend: -0.07 },
  { asset_id: "fBTC" as const, balance: 1.84,   value_usd: 112480, allocation_pct: 23.69, target_allocation_pct: 25, apy: 3.12, trend: +0.22 },
]

interface PositionsTableProps {
  showFull?: boolean
}

export function PositionsTable({ showFull = false }: PositionsTableProps) {
  const { data: positions, isLoading } = usePositions()
  const rows = positions ?? MOCK_POSITIONS
  const display = showFull ? rows : rows

  const [rebalanceAsset, setRebalanceAsset] = useState<string | null>(null)

  // Build rebalance suggestion for modal
  const buildSuggestion = (fromAssetId: string) => {
    const from = rows.find(p => p.asset_id === fromAssetId)
    if (!from) return undefined
    // Pick the most underweight asset as the target
    const target = rows
      .filter(p => p.asset_id !== fromAssetId)
      .sort((a, b) => (a.allocation_pct - a.target_allocation_pct) - (b.allocation_pct - b.target_allocation_pct))[0]
    if (!target) return undefined
    const drift = Math.abs(from.allocation_pct - from.target_allocation_pct)
    const amountUsd = (drift / 100) * from.value_usd
    return {
      fromAsset: fromAssetId,
      toAsset: target.asset_id,
      amountUsd,
      reasoning: `${fromAssetId} is overweight by ${drift.toFixed(2)}% vs target of ${from.target_allocation_pct}%. Shifting to ${target.asset_id} which is underweight by ${Math.abs(target.allocation_pct - target.target_allocation_pct).toFixed(2)}%.`,
      expectedApyDelta: +(target.apy - from.apy).toFixed(3),
      expectedValueDelta: Math.round(amountUsd * Math.abs(target.apy - from.apy) / 100),
    }
  }

  return (
    <>
      <div className="card">
        <SectionHeader
          title="RWA Positions"
          subtitle="Live portfolio allocations on Mantle"
          action={
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                const drifted = rows.find(p => Math.abs(p.allocation_pct - p.target_allocation_pct) > 2.5)
                if (drifted) setRebalanceAsset(drifted.asset_id)
              }}
            >
              Rebalance All
            </button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {["Asset", "Balance", "Value", "APY", "Allocation", "Drift", "Risk", ""].map((h) => (
                  <th key={h} className="stat-label pb-3 text-left first:pl-0 px-3 last:px-0 last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 px-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                : display.map((pos) => {
                    const asset = ASSETS[pos.asset_id]
                    const drift = pos.allocation_pct - pos.target_allocation_pct
                    const driftAbs = Math.abs(drift)
                    const needsRebalance = driftAbs > 2.5

                    return (
                      <tr key={pos.asset_id} className="hover:bg-surface-muted/40 transition-colors group">
                        {/* Asset */}
                        <td className="py-4 pl-0 pr-3">
                          <div className="flex items-center gap-2.5">
                            <AssetChip assetId={pos.asset_id} />
                            <div>
                              <p className="font-semibold text-text-primary">{asset.name}</p>
                              <p className="text-xs text-text-muted">{asset.issuer}</p>
                            </div>
                          </div>
                        </td>

                        {/* Balance */}
                        <td className="py-4 px-3">
                          <span className="font-mono text-xs text-text-secondary">
                            {pos.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="py-4 px-3">
                          <span className="font-semibold text-text-primary">
                            {formatUSD(pos.value_usd, true)}
                          </span>
                        </td>

                        {/* APY */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold" style={{ color: asset.color }}>
                              {formatAPY(pos.apy)}
                            </span>
                            {pos.trend >= 0
                              ? <TrendingUp className="w-3 h-3 text-success" />
                              : <TrendingDown className="w-3 h-3 text-danger" />
                            }
                          </div>
                        </td>

                        {/* Allocation bar */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.min(pos.allocation_pct, 100)}%`, background: asset.color }}
                              />
                            </div>
                            <span className="text-xs text-text-secondary tabular-nums w-10">
                              {formatPct(pos.allocation_pct)}
                            </span>
                          </div>
                        </td>

                        {/* Drift */}
                        <td className="py-4 px-3">
                          <span className={clsx(
                            "text-xs font-medium tabular-nums",
                            needsRebalance ? "text-warning" : "text-text-muted"
                          )}>
                            {drift > 0 ? "+" : ""}{formatPct(drift)}
                          </span>
                        </td>

                        {/* Risk */}
                        <td className="py-4 px-3">
                          <Badge variant={asset.riskTier === "LOW" ? "low" : "med"}>
                            {asset.riskTier}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="py-4 pl-3 pr-0 text-right">
                          {needsRebalance && (
                            <button
                              onClick={() => setRebalanceAsset(pos.asset_id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-warning hover:text-warning/80 px-2 py-1 rounded-lg hover:bg-warning/10"
                            >
                              Rebalance
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Target vs actual footer */}
        {!isLoading && (
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center gap-2 text-xs text-text-muted">
            <span className="w-3 h-0.5 bg-surface-border rounded inline-block" />
            Target drift threshold: 2.5% · Drift shown as actual − target
            {rows.some(p => Math.abs(p.allocation_pct - p.target_allocation_pct) > 2.5) && (
              <span className="ml-auto text-warning font-medium">⚠ Rebalance recommended</span>
            )}
          </div>
        )}
      </div>

      {/* Rebalance modal */}
      {rebalanceAsset && (
        <RebalanceModal
          suggestion={buildSuggestion(rebalanceAsset)}
          onClose={() => setRebalanceAsset(null)}
        />
      )}
    </>
  )
}
