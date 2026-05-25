"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { formatUSD } from "@yieldmind/shared"
import { Card, SectionHeader, LiveIndicator, Skeleton } from "@/components/ui"
import { TrendingUp } from "lucide-react"
import { useState } from "react"

// Generate realistic-looking portfolio value history
function generatePortfolioHistory(days: number) {
  let value = 460000
  const now = Date.now()
  return Array.from({ length: days * 4 }, (_, i) => {
    const t = new Date(now - (days * 4 - i) * 6 * 60 * 60 * 1000)
    // Random walk with slight upward drift (yield accrual)
    value = value * (1 + (Math.random() * 0.003 - 0.001) + 0.0001)
    return {
      time: days <= 1
        ? t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : t.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(value),
    }
  })
}

const RANGES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-text-muted mb-1">{label}</p>
      <p className="font-bold text-brand-cyan text-sm">{formatUSD(payload[0].value)}</p>
    </div>
  )
}

export function PortfolioValueChart() {
  const [range, setRange] = useState(0) // index into RANGES
  const data = generatePortfolioHistory(RANGES[range].days)

  const first = data[0]?.value ?? 0
  const last  = data[data.length - 1]?.value ?? 0
  const delta = last - first
  const deltaPct = first > 0 ? (delta / first) * 100 : 0
  const positive = delta >= 0

  return (
    <Card>
      <SectionHeader
        title="Portfolio Value"
        subtitle={`${RANGES[range].label} performance`}
        icon={<TrendingUp className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1">
            <LiveIndicator />
            <div className="ml-3 flex bg-surface-muted rounded-lg p-0.5">
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setRange(i)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    range === i
                      ? "bg-brand-cyan text-surface-base"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Delta badge */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-bold text-text-primary tabular-nums">
          {formatUSD(last)}
        </span>
        <span className={`text-sm font-semibold ${positive ? "text-success" : "text-danger"}`}>
          {positive ? "+" : ""}{formatUSD(delta, true)} ({deltaPct.toFixed(2)}%)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00E5CC" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00E5CC" stopOpacity={0.0}  />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#4A607A", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(data.length / 5)}
          />
          <YAxis
            tick={{ fill: "#4A607A", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00E5CC"
            strokeWidth={2}
            fill="url(#portfolioGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#00E5CC", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
