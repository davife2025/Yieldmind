import type { Metadata } from "next"
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview"
import { PositionsTable } from "@/components/dashboard/PositionsTable"
import { YieldChart } from "@/components/dashboard/YieldChart"
import { AgentFeed } from "@/components/agent/AgentFeed"
import { RiskAlertsPanel } from "@/components/dashboard/RiskAlertsPanel"
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard"
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart"
import { AllocationChart } from "@/components/charts/AllocationChart"

export const metadata: Metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Your AI agent is monitoring and optimising your RWA portfolio on Mantle.
        </p>
      </div>

      <PortfolioOverview />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><PortfolioValueChart /></div>
        <AllocationChart />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><PositionsTable /></div>
        <div className="space-y-6">
          <AgentIdentityCard />
          <RiskAlertsPanel />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><YieldChart /></div>
        <div className="card h-full">
          <p className="stat-label mb-4">APY Breakdown</p>
          <div className="space-y-3">
            {[
              { id: "USDY", apy: 5.23, color: "#00E5CC", pct: 26.22, contrib: 1.37 },
              { id: "mETH", apy: 4.81, color: "#7B61FF", pct: 31.30, contrib: 1.51 },
              { id: "USDe", apy: 8.94, color: "#FF6B35", pct: 18.79, contrib: 1.68 },
              { id: "fBTC", apy: 3.12, color: "#F7931A", pct: 23.69, contrib: 0.74 },
            ].map((a) => (
              <div key={a.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                    <span className="text-xs font-semibold text-text-primary">{a.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{a.pct.toFixed(1)}%</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: a.color }}>{a.apy.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(a.apy / 10) * 100}%`, background: a.color, opacity: 0.8 }} />
                </div>
                <p className="text-[10px] text-text-muted text-right">+{a.contrib.toFixed(2)}% weighted contribution</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AgentFeed />
    </div>
  )
}
