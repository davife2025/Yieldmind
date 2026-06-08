"use client"

import { Card, Skeleton } from "@/components/ui"
import { ASSETS } from "@yieldmind/shared"
import { usePositions } from "@/hooks/usePositions"

// ─────────────────────────────────────────────────────────────
// APYBreakdownPanel
// Shows each asset's APY, allocation %, and weighted contribution.
// Uses live data from usePositions — updates when agent rebalances.
// ─────────────────────────────────────────────────────────────

const MOCK = [
  { asset_id: "USDY" as const, apy: 5.23, allocation_pct: 26.22 },
  { asset_id: "mETH" as const, apy: 4.81, allocation_pct: 31.30 },
  { asset_id: "USDe" as const, apy: 8.94, allocation_pct: 18.79 },
  { asset_id: "fBTC" as const, apy: 3.12, allocation_pct: 23.69 },
]

export function APYBreakdownPanel() {
  const { data: positions, isLoading } = usePositions()
  const rows = positions ?? MOCK

  // Weighted APY = sum of (apy * allocation_pct / 100)
  const weightedApy = rows.reduce((s, p) => s + (p.apy * p.allocation_pct) / 100, 0)
  const maxApy      = Math.max(...rows.map(p => p.apy), 0.01)

  return (
    <Card className="h-full flex flex-col">
      <p className="stat-label mb-1">APY Breakdown</p>
      <p className="text-2xl font-bold text-brand-cyan tabular-nums mb-4">
        {isLoading ? "—" : `${weightedApy.toFixed(2)}%`}
        <span className="text-xs text-text-muted font-normal ml-1">weighted</span>
      </p>

      <div className="space-y-3 flex-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          : rows.map((pos) => {
              const asset   = ASSETS[pos.asset_id]
              const contrib = (pos.apy * pos.allocation_pct) / 100

              return (
                <div key={pos.asset_id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: asset.color }}
                      />
                      <span className="text-xs font-semibold text-text-primary">
                        {pos.asset_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted tabular-nums">
                        {pos.allocation_pct.toFixed(1)}%
                      </span>
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: asset.color }}
                      >
                        {pos.apy.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* APY bar — scaled to max APY in portfolio */}
                  <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:      `${(pos.apy / maxApy) * 100}%`,
                        background: asset.color,
                        opacity:    0.8,
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-text-muted text-right">
                    +{contrib.toFixed(2)}% weighted contribution
                  </p>
                </div>
              )
            })
        }
      </div>
    </Card>
  )
}
