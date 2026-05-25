"use client"

import { useState } from "react"
import { Play, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import { Card, SectionHeader, Badge, LiveIndicator } from "@/components/ui"
import { formatTimeAgo } from "@yieldmind/shared"

interface RunResult {
  success: boolean
  decisionsWritten: number
  riskSignals: number
  yieldOpportunities: number
  rebalancesTriggered: number
  ranAt: string
  error?: string
}

export function AgentControls() {
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/agent/run", { method: "POST" })
      const data = await res.json()
      setLastRun(data)
    } catch (err: any) {
      setLastRun({ success: false, error: err.message, decisionsWritten: 0, riskSignals: 0, yieldOpportunities: 0, rebalancesTriggered: 0, ranAt: new Date().toISOString() })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <SectionHeader
        title="Agent Controls"
        subtitle="Manual trigger & run history"
        action={<LiveIndicator />}
      />

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={running}
        className="btn-primary w-full justify-center mb-4 py-3"
      >
        {running
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running agent...</>
          : <><Play className="w-4 h-4" /> Run Agent Now</>
        }
      </button>

      {/* Agent status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
          <span className="text-xs text-text-secondary font-medium">Status</span>
          <Badge variant="low" dot>Active</Badge>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
          <span className="text-xs text-text-secondary font-medium">Poll interval</span>
          <span className="text-xs font-semibold text-text-primary">30 min</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
          <span className="text-xs text-text-secondary font-medium">AI Model</span>
          <span className="text-xs font-mono text-brand-cyan">claude-sonnet-4</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
          <span className="text-xs text-text-secondary font-medium">Network</span>
          <span className="text-xs font-semibold text-text-primary">Mantle Testnet</span>
        </div>
      </div>

      {/* Last run result */}
      {lastRun && (
        <div className={`mt-4 p-4 rounded-xl border ${
          lastRun.success
            ? "bg-success/5 border-success/20"
            : "bg-danger/5 border-danger/20"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {lastRun.success
              ? <CheckCircle className="w-4 h-4 text-success" />
              : <XCircle className="w-4 h-4 text-danger" />
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
                { label: "Decisions", value: lastRun.decisionsWritten },
                { label: "Risk signals", value: lastRun.riskSignals },
                { label: "Yield opps", value: lastRun.yieldOpportunities },
                { label: "Rebalances", value: lastRun.rebalancesTriggered },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2 rounded-lg bg-surface-muted">
                  <p className="text-lg font-bold text-text-primary">{value}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-danger font-mono">{lastRun.error}</p>
          )}
        </div>
      )}
    </Card>
  )
}
