import type { Metadata } from "next"
import { AgentFeed } from "@/components/agent/AgentFeed"
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard"
import { AgentControls } from "@/components/agent/AgentControls"

export const metadata: Metadata = { title: "AI Agent" }

export default function AgentPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI Agent</h1>
        <p className="text-sm text-text-secondary mt-1">
          Your autonomous yield intelligence agent · ERC-8004 identity on Mantle
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6">
          <AgentIdentityCard />
          <AgentControls />
        </div>
        <div className="xl:col-span-2">
          <AgentFeed expanded />
        </div>
      </div>
    </div>
  )
}
