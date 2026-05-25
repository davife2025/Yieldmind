"use client"

import { useState, useEffect } from "react"
import { Bell, RefreshCw, ExternalLink } from "lucide-react"
import { formatTime } from "@yieldmind/shared"
import { WalletButton } from "@/components/wallet/WalletButton"
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

export function TopBar() {
  const [time, setTime] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { activeAlerts } = useRealtimeAlerts()
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
    <header className="h-16 bg-surface-raised border-b border-surface-border px-6 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs text-text-secondary font-medium hidden sm:block">Agent Active</span>
        </div>
        <div className="h-3 w-px bg-surface-border hidden sm:block" />
        <span className="font-mono text-xs text-text-muted tabular-nums hidden md:block">{time} UTC</span>
        <div className="h-3 w-px bg-surface-border hidden md:block" />
        <a href="https://explorer.testnet.mantle.xyz" target="_blank" rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1 text-xs text-text-muted hover:text-brand-cyan transition-colors">
          Mantle Testnet <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleRefresh} className="btn-ghost" title="Refresh data">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
        <Link href="/alerts" className="btn-ghost relative">
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
