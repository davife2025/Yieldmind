"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, BrainCircuit, BarChart3, ShieldAlert } from "lucide-react"
import { clsx } from "clsx"
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/positions", label: "Positions",  icon: BarChart3       },
  { href: "/agent",     label: "Agent",      icon: BrainCircuit    },
  { href: "/alerts",    label: "Alerts",     icon: ShieldAlert     },
]

export function MobileNav() {
  const pathname = usePathname()
  const { activeAlerts } = useRealtimeAlerts()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-raised border-t border-surface-border">
      <div className="flex items-center">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          const hasAlert = href === "/alerts" && activeAlerts.length > 0

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors relative",
                active ? "text-brand-cyan" : "text-text-muted"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {hasAlert && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-danger text-white text-[8px] font-bold flex items-center justify-center">
                    {activeAlerts.length}
                  </span>
                )}
              </div>
              {label}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-cyan rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
