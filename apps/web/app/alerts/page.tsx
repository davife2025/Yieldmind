import type { Metadata } from "next"
import { AlertsView } from "@/components/dashboard/AlertsView"

export const metadata: Metadata = { title: "Risk Alerts" }

export default function AlertsPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Risk Alerts</h1>
        <p className="text-sm text-text-secondary mt-1">
          AI-detected risk signals across your RWA portfolio
        </p>
      </div>
      <AlertsView />
    </div>
  )
}
