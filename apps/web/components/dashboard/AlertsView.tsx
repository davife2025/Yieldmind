"use client"

import { useState } from "react"
import { ShieldAlert, ShieldCheck, ShieldX, Filter, X, ExternalLink } from "lucide-react"
import { Card, SectionHeader, Badge, EmptyState, LiveIndicator } from "@/components/ui"
import { formatTimeAgo, getMantleExplorerUrl } from "@yieldmind/shared"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clsx } from "clsx"

type Severity = "ALL" | "CRITICAL" | "HIGH" | "MED" | "LOW"

const MOCK_ALERTS = [
  { id: "1", asset_id: "USDe", severity: "MED",  title: "Funding Rate Elevated",  message: "USDe 8h funding rate at 0.031%, above 0.025% threshold. Position reduced by 8% as precaution.", resolved: false, created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
  { id: "2", asset_id: null,   severity: "LOW",  title: "Gas Price Spike",         message: "Mantle network gas spiked to 0.08 gwei. Next rebalance transactions will be batched.", resolved: true,  created_at: new Date(Date.now() - 78 * 60 * 1000).toISOString() },
  { id: "3", asset_id: "mETH", severity: "LOW",  title: "APY Epoch Update",        message: "mETH staking APY updated from 4.69% to 4.81% following new epoch. Portfolio adjusted.", resolved: true,  created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
]

const SEVERITY_CONFIG = {
  CRITICAL: { variant: "critical" as const, icon: ShieldX,     label: "Critical" },
  HIGH:     { variant: "high"     as const, icon: ShieldAlert,  label: "High" },
  MED:      { variant: "med"      as const, icon: ShieldAlert,  label: "Medium" },
  LOW:      { variant: "low"      as const, icon: ShieldCheck,  label: "Low" },
}

async function fetchAlerts() {
  const res = await fetch("/api/alerts")
  if (!res.ok) throw new Error("Failed to fetch alerts")
  const data = await res.json()
  return data.alerts?.length ? data.alerts : MOCK_ALERTS
}

async function resolveAlert(id: string) {
  const res = await fetch("/api/alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error("Failed to resolve alert")
  return res.json()
}

export function AlertsView() {
  const [filter, setFilter] = useState<Severity>("ALL")
  const queryClient = useQueryClient()

  const { data: alerts = MOCK_ALERTS, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 30_000,
  })

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  })

  const filtered = alerts.filter((a: any) =>
    filter === "ALL" || a.severity === filter
  )
  const active   = alerts.filter((a: any) => !a.resolved)
  const resolved = alerts.filter((a: any) => a.resolved)

  return (
    <div className="space-y-4">

      {/* Summary row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Active",    value: active.length,   color: "text-warning", bg: "bg-warning/5 border-warning/20" },
          { label: "Resolved",  value: resolved.length, color: "text-success", bg: "bg-success/5 border-success/20" },
          { label: "High+",     value: active.filter((a: any) => ["CRITICAL","HIGH"].includes(a.severity)).length, color: "text-danger", bg: "bg-danger/5 border-danger/20" },
          { label: "This week", value: alerts.length,   color: "text-text-primary", bg: "bg-surface-raised border-surface-border" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`p-4 rounded-xl border ${bg}`}>
            <p className="stat-label">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <Card>
        <SectionHeader
          title="Alert Feed"
          subtitle="AI-detected risk signals"
          icon={<ShieldAlert className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-2">
              <LiveIndicator />
              <div className="flex bg-surface-muted rounded-lg p-0.5">
                {(["ALL", "HIGH", "MED", "LOW"] as Severity[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                      filter === s
                        ? "bg-brand-cyan text-surface-base"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6 text-success" />}
            title="No alerts match this filter"
            description="All clear — your portfolio is within safe parameters"
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((alert: any) => {
              const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG]
              const Icon = cfg.icon

              return (
                <div
                  key={alert.id}
                  className={clsx(
                    "p-4 rounded-xl border transition-all group",
                    alert.resolved
                      ? "bg-surface-muted border-surface-border opacity-60"
                      : alert.severity === "HIGH" || alert.severity === "CRITICAL"
                      ? "bg-danger/5 border-danger/20"
                      : alert.severity === "MED"
                      ? "bg-warning/5 border-warning/20"
                      : "bg-surface-muted border-surface-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      "p-2 rounded-xl shrink-0",
                      alert.resolved ? "bg-surface-overlay" :
                      alert.severity === "HIGH" ? "bg-danger/10" :
                      alert.severity === "MED"  ? "bg-warning/10" : "bg-surface-overlay"
                    )}>
                      <Icon className={clsx(
                        "w-4 h-4",
                        alert.resolved ? "text-text-muted" :
                        alert.severity === "HIGH" ? "text-danger" :
                        alert.severity === "MED"  ? "text-warning" : "text-success"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-text-primary">{alert.title}</span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {alert.asset_id && (
                          <Badge variant="neutral">{alert.asset_id}</Badge>
                        )}
                        {alert.resolved && <Badge variant="low">Resolved</Badge>}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{alert.message}</p>
                      <p className="text-[11px] text-text-muted mt-2">{formatTimeAgo(alert.created_at)}</p>
                    </div>

                    {!alert.resolved && (
                      <button
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 shrink-0 transition-opacity"
                        title="Mark as resolved"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
