"use client"

import { TrendingUp, DollarSign, Zap, Activity } from "lucide-react"
import { formatUSD, formatAPY, formatPct } from "@yieldmind/shared"
import { usePortfolioStats } from "@/hooks/usePortfolioStats"

export function PortfolioOverview() {
  const { data, isLoading } = usePortfolioStats()

  const stats = data ?? {
    totalValue: 474810,
    weightedApy: 5.52,
    dailyYield: 71.74,
    decisionsToday: 4,
    totalChange24h: 0.38,
  }

  const cards = [
    {
      label: "Total Portfolio Value",
      value: formatUSD(stats.totalValue),
      change: formatPct(stats.totalChange24h, true),
      changePositive: stats.totalChange24h >= 0,
      icon: DollarSign,
      color: "text-brand-cyan",
      bg: "bg-brand-cyan/10",
    },
    {
      label: "Weighted APY",
      value: formatAPY(stats.weightedApy),
      change: "across 4 assets",
      changePositive: true,
      icon: TrendingUp,
      color: "text-brand-purple",
      bg: "bg-brand-purple/10",
    },
    {
      label: "Daily Yield Earned",
      value: formatUSD(stats.dailyYield),
      change: "today",
      changePositive: true,
      icon: Zap,
      color: "text-brand-gold",
      bg: "bg-brand-gold/10",
    },
    {
      label: "Agent Decisions",
      value: String(stats.decisionsToday),
      change: "last 24h",
      changePositive: true,
      icon: Activity,
      color: "text-success",
      bg: "bg-success/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card-hover">
          <div className="flex items-start justify-between mb-3">
            <p className="stat-label">{card.label}</p>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-32 bg-surface-muted rounded animate-pulse" />
          ) : (
            <p className="stat-value">{card.value}</p>
          )}
          <p className={`text-xs mt-1.5 font-medium ${
            card.changePositive ? "text-success" : "text-danger"
          }`}>
            {card.change}
          </p>
        </div>
      ))}
    </div>
  )
}
