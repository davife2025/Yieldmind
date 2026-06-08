"use client"

import { useState, useEffect } from "react"
import { Bell, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react"
import { formatTime } from "@yieldmind/shared"
import { WalletButton } from "@/components/wallet/WalletButton"
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts"
import { usePrices } from "@/hooks/usePrices"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { clsx } from "clsx"

function PricePill({ symbol, price, change24h }: { symbol: string; price: number; change24h: number }) {
  const positive = change24h >= 0
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-surface-muted rounded-lg border border-surface-border">
      <span className="text-[11px] font-semibold text-text-secondary">{symbol}</span>
      <span className="text-[11px] font-mono font-bold text-text-primary">
        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className={clsx("text-[10px] font-semibold flex items-center gap-0.5", positive ? "text-success" : "text-danger")}>
        {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        {positive ? "+" : ""}{(change24h * 100).toFixed(2)}%
      </span>
    </div>
  )
}

export function TopBar() {
  const [time, setTime] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { activeAlerts } = useRealtimeAlerts()
  const { data: prices } = usePrices()
  const queryClient = useQueryClient()

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date().toISOString()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <header className="h-16 bg-surface-raised border-b border-surface-border px-4 md:px-6 flex items-center justify-between shrink-0 z-20 gap-3">

      {/* Left — status + prices */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs text-text-secondary font-medium hidden sm:block">Agent Active</span>
        </div>

        <div className="h-3 w-px bg-surface-border hidden sm:block shrink-0" />

        {/* Live prices from Bybit */}
        {prices && (
          <>
            <PricePill symbol="ETH" price={prices.ETH.price} change24h={prices.ETH.change24h} />
            <PricePill symbol="BTC" price={prices.BTC.price} change24h={prices.BTC.change24h} />
          </>
        )}

        <div className="h-3 w-px bg-surface-border hidden md:block shrink-0" />
        <span className="font-mono text-xs text-text-muted tabular-nums hidden md:block">{time} UTC</span>

        <div className="h-3 w-px bg-surface-border hidden lg:block shrink-0" />
        <a
          href="https://explorer.testnet.mantle.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1 text-xs text-text-muted hover:text-brand-cyan transition-colors shrink-0"
        >
          Mantle Testnet <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={handleRefresh} className="btn-ghost p-2" title="Refresh all data">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>

        <Link href="/alerts" className="btn-ghost p-2 relative">
          <Bell className="w-4 h-4" />
          {activeAlerts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
              {activeAlerts.length > 9 ? "9+" : activeAlerts.length}
            </span>
          )}
        </Link>

        <div className="h-5 w-px bg-surface-border mx-1" />
        <WalletButton />
      </div>
    </header>
  )
}
