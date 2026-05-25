"use client"

import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { formatUSD, formatAPY, formatPct } from "@yieldmind/shared"
import { ASSETS } from "@yieldmind/shared"
import { usePositions } from "@/hooks/usePositions"
import { clsx } from "clsx"

const MOCK_POSITIONS = [
  { asset_id: "USDY" as const, balance: 124500, value_usd: 124500, allocation_pct: 26.22, target_allocation_pct: 25, apy: 5.23, trend: +0.04 },
  { asset_id: "mETH" as const, balance: 42.18,  value_usd: 148630, allocation_pct: 31.30, target_allocation_pct: 32, apy: 4.81, trend: +0.11 },
  { asset_id: "USDe" as const, balance: 89200,  value_usd: 89200,  allocation_pct: 18.79, target_allocation_pct: 18, apy: 8.94, trend: -0.07 },
  { asset_id: "fBTC" as const, balance: 1.84,   value_usd: 112480, allocation_pct: 23.69, target_allocation_pct: 25, apy: 3.12, trend: +0.22 },
]

export function PositionsTable() {
  const { data: positions, isLoading } = usePositions()
  const rows = positions ?? MOCK_POSITIONS

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">RWA Positions</h2>
          <p className="text-xs text-text-muted mt-0.5">Live portfolio allocations on Mantle</p>
        </div>
        <button className="btn-ghost text-xs">
          Rebalance All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {["Asset", "Balance", "Value", "APY", "Allocation", "Drift", ""].map((h) => (
                <th key={h} className="stat-label pb-3 text-left first:pl-0 px-3 last:px-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="py-4 px-3">
                        <div className="h-4 bg-surface-muted rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((pos) => {
                  const asset = ASSETS[pos.asset_id]
                  const drift = pos.allocation_pct - pos.target_allocation_pct
                  const driftAbs = Math.abs(drift)
                  const needsRebalance = driftAbs > 2.5

                  return (
                    <tr key={pos.asset_id} className="hover:bg-surface-muted/40 transition-colors group">
                      {/* Asset */}
                      <td className="py-4 pl-0 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: asset.bgColor, color: asset.color }}
                          >
                            {asset.id.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">{asset.name}</p>
                            <p className="text-xs text-text-muted">{asset.issuer}</p>
                          </div>
                        </div>
                      </td>

                      {/* Balance */}
                      <td className="py-4 px-3">
                        <span className="mono text-text-secondary">
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
                              style={{
                                width: `${pos.allocation_pct}%`,
                                background: asset.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary tabular-nums">
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

                      {/* Risk badge + action */}
                      <td className="py-4 pl-3 pr-0">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "badge",
                            asset.riskTier === "LOW" ? "badge-low" : "badge-med"
                          )}>
                            {asset.riskTier}
                          </span>
                          {needsRebalance && (
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost text-xs text-warning">
                              Rebalance
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
