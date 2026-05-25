"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ASSETS } from "@yieldmind/shared"
import { formatUSD, formatPct } from "@yieldmind/shared"
import { Card, SectionHeader, Skeleton } from "@/components/ui"
import { PieChart as PieIcon } from "lucide-react"
import { usePositions } from "@/hooks/usePositions"

const MOCK = [
  { asset_id: "USDY", value_usd: 124500, allocation_pct: 26.22 },
  { asset_id: "mETH", value_usd: 148630, allocation_pct: 31.30 },
  { asset_id: "USDe", value_usd:  89200, allocation_pct: 18.79 },
  { asset_id: "fBTC", value_usd: 112480, allocation_pct: 23.69 },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const asset = ASSETS[d.asset_id as keyof typeof ASSETS]
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-xl p-3 text-xs shadow-xl">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: asset.color }} />
        <span className="font-semibold text-text-primary">{asset.name}</span>
      </div>
      <p className="text-text-secondary">{formatUSD(d.value_usd)}</p>
      <p className="font-semibold" style={{ color: asset.color }}>{formatPct(d.allocation_pct)}</p>
    </div>
  )
}

export function AllocationChart() {
  const { data: positions, isLoading } = usePositions()
  const data = positions ?? MOCK

  return (
    <Card>
      <SectionHeader
        title="Allocation"
        subtitle="Target vs actual"
        icon={<PieIcon className="w-4 h-4" />}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Skeleton className="w-36 h-36 rounded-full" />
        </div>
      ) : (
        <>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value_usd"
                  nameKey="asset_id"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.asset_id}
                      fill={ASSETS[entry.asset_id as keyof typeof ASSETS]?.color ?? "#888"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xs text-text-muted">Total</p>
              <p className="text-base font-bold text-text-primary tabular-nums">
                {formatUSD(data.reduce((s, p) => s + p.value_usd, 0), true)}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data.map((pos) => {
              const asset = ASSETS[pos.asset_id as keyof typeof ASSETS]
              return (
                <div key={pos.asset_id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-muted">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: asset.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">{asset.name}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: asset.color }}>
                        {formatPct(pos.allocation_pct)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}
