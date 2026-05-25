"use client"

import { ShieldAlert, ShieldCheck, X } from "lucide-react"
import { formatTimeAgo } from "@yieldmind/shared"
import { clsx } from "clsx"

const MOCK_ALERTS = [
  {
    id: "1",
    asset_id: "USDe",
    severity: "MED" as const,
    title: "Funding Rate Elevated",
    message: "USDe 8h rate at 0.031%, above threshold. Position reduced.",
    resolved: false,
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    asset_id: null,
    severity: "LOW" as const,
    title: "Gas Price Spike",
    message: "Mantle gas at 0.08 gwei. Batching next transactions.",
    resolved: true,
    created_at: new Date(Date.now() - 78 * 60 * 1000).toISOString(),
  },
]

const SEVERITY_STYLES = {
  LOW:      { badge: "badge-low",  dot: "bg-success" },
  MED:      { badge: "badge-med",  dot: "bg-warning" },
  HIGH:     { badge: "badge-high", dot: "bg-danger" },
  CRITICAL: { badge: "badge-critical", dot: "bg-danger" },
}

export function RiskAlertsPanel() {
  const active = MOCK_ALERTS.filter((a) => !a.resolved)
  const resolved = MOCK_ALERTS.filter((a) => a.resolved)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h2 className="text-base font-semibold text-text-primary">Risk Alerts</h2>
          {active.length > 0 && (
            <span className="badge badge-med">{active.length} active</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {active.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity]
          return (
            <div
              key={alert.id}
              className="p-3 rounded-xl bg-surface-muted border border-warning/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", styles.dot)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
                      {alert.asset_id && (
                        <span className={styles.badge}>{alert.asset_id}</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      {alert.message}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1.5">
                      {formatTimeAgo(alert.created_at)}
                    </p>
                  </div>
                </div>
                <button className="btn-ghost p-1 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {resolved.map((alert) => (
          <div
            key={alert.id}
            className="p-3 rounded-xl bg-surface-muted border border-surface-border opacity-50"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
              <div>
                <p className="text-xs font-medium text-text-secondary">{alert.title}</p>
                <p className="text-[11px] text-text-muted">{formatTimeAgo(alert.created_at)}</p>
              </div>
              <span className="ml-auto badge badge-low text-[10px]">Resolved</span>
            </div>
          </div>
        ))}

        {MOCK_ALERTS.length === 0 && (
          <div className="text-center py-6">
            <ShieldCheck className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-sm text-text-secondary">All clear — no active alerts</p>
          </div>
        )}
      </div>
    </div>
  )
}
