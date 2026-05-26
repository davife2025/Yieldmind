"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts"
import { ASSETS } from "@yieldmind/shared"
import { Card, SectionHeader, Skeleton } from "@/components/ui"
import { BarChart2 } from "lucide-react"
import { usePositions } from "@/hooks/usePositions"

const MOCK = [
  { asset_id: "USDe", apy: 8.94, allocation_pct: 18.79, value_usd: 89200,  target_allocation_pct: 18, balance: 89200,  trend: -0.07 },
  { asset_id: "USDY", apy: 5.23, allocation_pct: 26.22, value_usd: 124500, target_allocation_pct: 25, balance: 124500, trend: +0.04 },
  { asset_id: "mETH", apy: 4.81, allocation_pct: 31.30, value_usd: 148630, target_allocation_pct: 32, balance: 42.18,  trend: +0.11 },
  { asset_id: "fBTC", apy: 3.12, allocation_pct: 23.69, value_usd: 112480, target_allocation_pct: 25, balance: 1.84,   trend: +0.22 },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const asset = ASSETS[d.asset_id as keyof typeof ASSETS]
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-xl p-3 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: asset.color }} />
        <span className="font-semibold text-text-primary">{asset.name}</span>
        <span className="font-bold ml-auto" style={{ color: asset.color }}>{d.apy.toFixed(2)}% APY</span>
      </div>
      <p className="text-text-muted mt-1">{asset.issuer}</p>
    </div>
  )
}

export function APYBarChart() {
  const { data: positions, isLoading } = usePositions()
  const chartData = (positions ?? MOCK)
    .map((p) => ({ asset_id: p.asset_id, apy: p.apy }))
    .sort((a, b) => b.apy - a.apy)

  const weightedAvg = positions
    ? positions.reduce((s, p) => s + (p.apy * p.allocation_pct) / 100, 0)
    : 5.52

  return (
    <Card>
      <SectionHeader
        title="APY Comparison"
        subtitle="Current yield by asset"
        icon={<BarChart2 className="w-4 h-4" />}
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
            <XAxis
              dataKey="asset_id"
              tick={{ fill: "#8899BB", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#4A607A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine
              y={weightedAvg}
              stroke="#00E5CC"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `Avg ${weightedAvg.toFixed(2)}%`,
                fill: "#00E5CC",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <Bar dataKey="apy" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.asset_id}
                  fill={ASSETS[entry.asset_id as keyof typeof ASSETS]?.color ?? "#888"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
