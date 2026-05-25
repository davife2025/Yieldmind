"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BrainCircuit,
  BarChart3,
  ShieldAlert,
  Wallet,
  Settings,
  Zap,
} from "lucide-react"
import { clsx } from "clsx"

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/agent",      label: "AI Agent",   icon: BrainCircuit },
  { href: "/positions",  label: "Positions",  icon: BarChart3 },
  { href: "/alerts",     label: "Alerts",     icon: ShieldAlert },
]

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-surface-raised border-r border-surface-border shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-surface-border">
        <div className="w-7 h-7 rounded-lg bg-brand-cyan flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-surface-base" strokeWidth={2.5} />
        </div>
        <div>
          <span className="font-bold text-text-primary text-base tracking-tight">YieldMind</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[10px] text-text-muted font-medium">Mantle Testnet</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="stat-label px-2 mb-3">Navigation</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {label === "Alerts" && (
                <span className="ml-auto bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  1
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-surface-border pt-3 space-y-0.5">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-all"
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Agent identity mini-card */}
        <div className="mt-3 p-3 rounded-xl bg-surface-muted border border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
              <BrainCircuit className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">Agent #1</p>
              <p className="text-[10px] text-text-muted truncate">0xDemo...0001</p>
            </div>
            <Wallet className="w-3.5 h-3.5 text-text-muted shrink-0" />
          </div>
        </div>
      </div>
    </aside>
  )
}
