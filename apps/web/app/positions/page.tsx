import type { Metadata } from "next"
import { PositionsTable } from "@/components/dashboard/PositionsTable"
import { AllocationChart } from "@/components/charts/AllocationChart"
import { APYBarChart } from "@/components/charts/APYBarChart"

export const metadata: Metadata = { title: "Positions" }

export default function PositionsPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Positions</h1>
        <p className="text-sm text-text-secondary mt-1">
          Live RWA holdings on Mantle · AI-managed allocations
        </p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AllocationChart />
        <APYBarChart />
      </div>

      {/* Full positions table */}
      <PositionsTable showFull />
    </div>
  )
}
