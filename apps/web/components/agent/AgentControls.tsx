"use client"

import { useState } from "react"
import { Play, RefreshCw, CheckCircle, XCircle, Clock, Activity } from "lucide-react"
import { Card, SectionHeader, Badge, LiveIndicator, Skeleton } from "@/components/ui"
import { formatTimeAgo } from "@yieldmind/shared"
import { useQueryClient } from "@tanstack/react-query"
import { useAgentStatus } from "@/hooks/useAgentStatus"

interface RunResult {
  success:             boolean
  decisionsWritten:    number
  riskSignals:         number
  yieldOpportunities:  number
  rebalancesTriggered: number
  ranAt:               string
  error?:              string
}

export function AgentControls() {
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)
  const queryClient           = useQueryClient()
  const { data: status, isLoading: statusLoading } = useAgentStatus()

  const handleRun = async () => {
    setRunning(true)
    try {
      const res  = await fetch("/api/agent/run", { method: "POST" })
      const data = await res.json()
      setLastRun(data)

      if (data.success) {
        // Invalidate everything — decisions, positions, alerts, status
        await queryClient.invalidateQueries()
      }
    } catch (err: unknown) {
      setLastRun({
        success: false, error: err instanceof Error ? err.message : String(err),
        decisionsWritten: 0, riskSignals: 0,
        yieldOpportunities: 0, rebalancesTriggered: 0,
        ranAt: new Date().toISOString(),
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <SectionHeader
        title="Agent Controls"
        subtitle="Manual trigger · live status"
        icon={<Activity className="w-4 h-4" />}
        action={<LiveIndicator />}
      />

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={running}
        className="btn-primary w-full justify-center mb-5 py-3"
      >
        {running
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running agent...</>
          : <><Play className="w-4 h-4" /> Run Agent Now</>
        }
      </button>

      {/* Live status from /api/agent/status */}
      <div className="space-y-2 mb-4">
        {statusLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))
        ) : (
          <>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
              <span className="text-xs text-text-secondary font-medium">Status</span>
              <Badge variant={status?.status === "overdue" ? "med" : "low"} dot>
                {status?.status === "overdue" ? "Overdue" : "Active"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
              <span className="text-xs text-text-secondary font-medium">Last run</span>
              <span className="text-xs font-semibold text-text-primary">
                {status?.lastRunAt ? formatTimeAgo(status.lastRunAt) : "Never"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
              <span className="text-xs text-text-secondary font-medium">Next run</span>
              <span className="text-xs font-semibold text-text-primary">
                {status?.nextRunAt ? formatTimeAgo(status.nextRunAt) : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
              <span className="text-xs text-text-secondary font-medium">AI model</span>
              <span className="text-xs font-mono text-brand-cyan">
                {status?.model ?? "Kimi K2"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
              <span className="text-xs text-text-secondary font-medium">Network</span>
              <span className="text-xs font-semibold text-text-primary">
                {status?.network ?? "Mantle Testnet"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Decision counters */}
      {status && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Total",   value: status.decisions.total    },
            { label: "24h",     value: status.decisions.last24h  },
            { label: "Alerts",  value: status.activeAlerts       },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-2.5 rounded-xl bg-surface-muted border border-surface-border">
              <p className="text-base font-bold text-text-primary tabular-nums">{value}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Last manual run result */}
      {lastRun && (
        <div className={`p-4 rounded-xl border ${
          lastRun.success
            ? "bg-success/5 border-success/20"
            : "bg-danger/5 border-danger/20"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {lastRun.success
              ? <CheckCircle className="w-4 h-4 text-success" />
              : <XCircle    className="w-4 h-4 text-danger"  />
            }
            <span className="text-sm font-semibold text-text-primary">
              {lastRun.success ? "Run complete" : "Run failed"}
            </span>
            <span className="text-xs text-text-muted ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(lastRun.ranAt)}
            </span>
          </div>

          {lastRun.success ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Decisions",  value: lastRun.decisionsWritten    },
                { label: "Risk",       value: lastRun.riskSignals         },
                { label: "Yield opps", value: lastRun.yieldOpportunities  },
                { label: "Rebalances", value: lastRun.rebalancesTriggered },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2 rounded-lg bg-surface-muted">
                  <p className="text-lg font-bold text-text-primary">{value}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-danger font-mono break-all">{lastRun.error}</p>
          )}
        </div>
      )}
    </Card>
  )
}
