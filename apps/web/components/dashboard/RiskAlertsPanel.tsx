"use client"

import { ShieldAlert, ShieldCheck, X } from "lucide-react"
import { formatTimeAgo } from "@yieldmind/shared"
import { Card, SectionHeader, Badge, EmptyState } from "@/components/ui"
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { clsx } from "clsx"

const SEVERITY_STYLES = {
  LOW:      { dot: "bg-success",  border: "border-surface-border",    bg: "bg-surface-muted"  },
  MED:      { dot: "bg-warning",  border: "border-warning/20",        bg: "bg-warning/5"      },
  HIGH:     { dot: "bg-danger",   border: "border-danger/20",         bg: "bg-danger/5"       },
  CRITICAL: { dot: "bg-danger animate-pulse", border: "border-danger/30", bg: "bg-danger/10"  },
}

async function resolveAlert(id: string) {
  const res = await fetch("/api/alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error("Failed to resolve")
  return res.json()
}

export function RiskAlertsPanel() {
  const { alerts, connected } = useRealtimeAlerts()
  const queryClient = useQueryClient()

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  })

  // Use live data; fall back to showing empty if no data yet
  const active   = alerts.filter(a => !a.resolved)
  const resolved = alerts.filter(a => a.resolved).slice(0, 2) // show last 2 resolved

  return (
    <Card>
      <SectionHeader
        title="Risk Alerts"
        icon={<ShieldAlert className="w-4 h-4 text-warning" />}
        action={
          active.length > 0
            ? <Badge variant="med">{active.length} active</Badge>
            : <Badge variant="low">All clear</Badge>
        }
      />

      <div className="space-y-2">
        {active.length === 0 && resolved.length === 0 && (
          <EmptyState
            icon={<ShieldCheck className="w-5 h-5 text-success" />}
            title="No active alerts"
            description="Agent is monitoring all positions"
          />
        )}

        {active.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] ?? SEVERITY_STYLES.LOW
          return (
            <div key={alert.id} className={clsx("p-3 rounded-xl border group", styles.bg, styles.border)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", styles.dot)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
                      {alert.asset_id && (
                        <Badge variant="neutral" className="text-[10px]">{alert.asset_id}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">
                      {alert.message}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1.5">
                      {formatTimeAgo(alert.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => resolveMutation.mutate(alert.id)}
                  disabled={resolveMutation.isPending}
                  className="btn-ghost p-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resolve alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {resolved.map((alert) => (
          <div key={alert.id} className="p-3 rounded-xl bg-surface-muted border border-surface-border opacity-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-secondary truncate">{alert.title}</p>
                <p className="text-[11px] text-text-muted">{formatTimeAgo(alert.created_at)}</p>
              </div>
              <Badge variant="low" className="text-[10px] shrink-0">Resolved</Badge>
            </div>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div className="mt-3 pt-3 border-t border-surface-border">
          <a href="/alerts" className="text-xs text-brand-cyan hover:text-brand-cyan/80 font-medium transition-colors">
            View all alerts →
          </a>
        </div>
      )}
    </Card>
  )
}
