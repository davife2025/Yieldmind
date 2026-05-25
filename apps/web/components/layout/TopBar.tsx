"use client"

import { useState, useEffect } from "react"
import { Bell, RefreshCw, ExternalLink } from "lucide-react"
import { formatTime } from "@yieldmind/shared"

export function TopBar() {
  const [time, setTime] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date().toISOString()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <header className="h-16 bg-surface-raised border-b border-surface-border px-6 flex items-center justify-between shrink-0 z-20">

      {/* Left — live clock + network status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-text-secondary font-medium">Agent Active</span>
        </div>
        <div className="h-3 w-px bg-surface-border" />
        <span className="font-mono text-xs text-text-muted tabular-nums">{time} UTC</span>
        <div className="h-3 w-px bg-surface-border" />
        <a
          href="https://explorer.testnet.mantle.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-cyan transition-colors"
        >
          Mantle Testnet
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="btn-ghost"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>

        <button className="btn-ghost relative" title="Alerts">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger" />
        </button>

        <div className="h-5 w-px bg-surface-border mx-1" />

        {/* Wallet connect placeholder */}
        <button className="btn-secondary text-xs">
          <span className="w-2 h-2 rounded-full bg-success" />
          0xDemo...0001
        </button>
      </div>
    </header>
  )
}
