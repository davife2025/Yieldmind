"use client"

import { useEffect, useRef, useState } from "react"
import { TrendingUp, DollarSign, Zap, Brain } from "lucide-react"
import { formatUSD, formatAPY, formatPct } from "@yieldmind/shared"
import { Card, Skeleton } from "@/components/ui"
import { usePortfolioStats } from "@/hooks/usePortfolioStats"

function AnimatedValue({ value, formatter }: { value: number; formatter: (v: number) => string }) {
  const [displayed, setDisplayed] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>()

  useEffect(() => {
    const start = displayed
    const end = value
    const duration = 800
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(start + (end - start) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return <span>{formatter(displayed)}</span>
}

const STATS_CONFIG = [
  {
    key: "totalValue",
    label: "Total Portfolio Value",
    formatter: (v: number) => formatUSD(v),
    subKey: "totalChange24h",
    subFormatter: (v: number) => `${v >= 0 ? "+" : ""}${formatPct(v)} today`,
    icon: DollarSign,
    iconBg: "bg-brand-cyan/10",
    iconColor: "text-brand-cyan",
    glow: "cyan" as const,
  },
  {
    key: "weightedApy",
    label: "Weighted APY",
    formatter: (v: number) => formatAPY(v),
    subKey: null,
    sub: "across 4 assets",
    icon: TrendingUp,
    iconBg: "bg-brand-purple/10",
    iconColor: "text-brand-purple",
    glow: "purple" as const,
  },
  {
    key: "dailyYield",
    label: "Daily Yield Earned",
    formatter: (v: number) => formatUSD(v),
    subKey: null,
    sub: "accruing today",
    icon: Zap,
    iconBg: "bg-brand-gold/10",
    iconColor: "text-brand-gold",
    glow: "gold" as const,
  },
  {
    key: "decisionsToday",
    label: "Agent Decisions",
    formatter: (v: number) => Math.round(v).toString(),
    subKey: null,
    sub: "last 24 hours",
    icon: Brain,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    glow: "none" as const,
  },
]

export function PortfolioOverview() {
  const { data, isLoading } = usePortfolioStats()

  const stats = data ?? {
    totalValue: 474810,
    weightedApy: 5.52,
    dailyYield: 71.74,
    decisionsToday: 4,
    totalChange24h: 0.38,
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {STATS_CONFIG.map((cfg) => {
        const value = stats[cfg.key as keyof typeof stats] as number
        const subValue = cfg.subKey ? (stats[cfg.subKey as keyof typeof stats] as number) : null
        const subText = cfg.subKey ? cfg.subFormatter!(subValue!) : cfg.sub!
        const subPositive = cfg.subKey ? (subValue ?? 0) >= 0 : true

        return (
          <Card key={cfg.key} glow={cfg.glow} className="group">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${cfg.iconBg} transition-transform group-hover:scale-110`}>
              <cfg.icon className={`w-4 h-4 ${cfg.iconColor}`} />
            </div>
            <p className="stat-label">{cfg.label}</p>
            {isLoading
              ? <div className="h-8 w-36 mt-2 mb-1.5 bg-surface-muted rounded animate-pulse" />
              : <p className="stat-value mt-1"><AnimatedValue value={value} formatter={cfg.formatter} /></p>
            }
            {!isLoading && (
              <p className={`text-xs font-medium mt-1.5 ${subPositive ? "text-success" : "text-danger"}`}>
                {subText}
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
