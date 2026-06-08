import type { Metadata } from "next"
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview"
import { PositionsTable } from "@/components/dashboard/PositionsTable"
import { YieldChart } from "@/components/dashboard/YieldChart"
import { AgentFeed } from "@/components/agent/AgentFeed"
import { RiskAlertsPanel } from "@/components/dashboard/RiskAlertsPanel"
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard"
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart"
import { AllocationChart } from "@/components/charts/AllocationChart"
import { APYBreakdownPanel } from "@/components/dashboard/APYBreakdownPanel"

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
        <APYBreakdownPanel />
      </div>

      <AgentFeed />
    </div>
  )
}
