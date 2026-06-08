import type { RechartsTooltipProps, TooltipPayloadEntry } from "@/components/charts/tooltipTypes"
"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { useYieldHistory } from "@/hooks/useYieldHistory"
import { ASSETS } from "@yieldmind/shared"
import { Card, SectionHeader, LiveIndicator, Skeleton } from "@/components/ui"
import { TrendingUp } from "lucide-react"

// ─────────────────────────────────────────────────────────────
// YieldChart — APY history line chart for all 4 assets
// Polls /api/yield every 60s, falls back to generated mock data
// ─────────────────────────────────────────────────────────────

const MOCK_DATA = Array.from({ length: 12 }, (_, i) => {
  const t = new Date(Date.now() - (11 - i) * 30 * 60 * 1000)
  return {
    time: t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    USDY: +(5.15 + Math.random() * 0.12).toFixed(3),
    mETH: +(4.70 + Math.random() * 0.15).toFixed(3),
    USDe: +(8.80 + Math.random() * 0.30).toFixed(3),
    fBTC: +(3.05 + Math.random() * 0.10).toFixed(3),
  }
})

const CustomTooltip = ({ active, payload, label }: RechartsTooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="text-text-muted mb-2 font-medium">{label}</p>
      {payload.map((p: TooltipPayloadEntry) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-text-secondary">{p.dataKey}</span>
          </span>
          <span className="font-semibold text-text-primary tabular-nums">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function YieldChart() {
  const { data, isLoading } = useYieldHistory()
  const chartData = data ?? MOCK_DATA

  return (
    <Card>
      <SectionHeader
        title="APY History"
        subtitle="30-minute intervals · last 6 hours"
        icon={<TrendingUp className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-3">
            <LiveIndicator label="30m refresh" />
            {/* Asset colour legend */}
            <div className="hidden sm:flex items-center gap-3">
              {(["USDY", "mETH", "USDe", "fBTC"] as const).map((id) => (
                <div key={id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: ASSETS[id].color }} />
                  <span className="text-xs text-text-secondary">{id}</span>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "#4A607A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: "#4A607A", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            {(["USDY", "mETH", "USDe", "fBTC"] as const).map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={ASSETS[id].color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: ASSETS[id].color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
