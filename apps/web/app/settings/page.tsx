import type { Metadata } from "next"
import { Settings, Database, Cpu, Globe, Key } from "lucide-react"

export const metadata: Metadata = { title: "Settings" }

const CONFIG_SECTIONS = [
  {
    title: "Network",
    icon: Globe,
    items: [
      { label: "Chain",          value: "Mantle Testnet",               mono: false },
      { label: "Chain ID",       value: "5003",                         mono: true  },
      { label: "RPC URL",        value: "https://rpc.testnet.mantle.xyz", mono: true },
      { label: "Explorer",       value: "https://explorer.testnet.mantle.xyz", mono: true },
    ],
  },
  {
    title: "AI Agent",
    icon: Cpu,
    items: [
      { label: "Model",          value: "claude-sonnet-4-20250514",     mono: true  },
      { label: "Poll interval",  value: "30 minutes",                   mono: false },
      { label: "Drift threshold",value: "2.5%",                         mono: false },
      { label: "Gas threshold",  value: "0.05 gwei",                    mono: false },
    ],
  },
  {
    title: "Database",
    icon: Database,
    items: [
      { label: "Provider",       value: "Supabase Postgres",            mono: false },
      { label: "Realtime",       value: "Enabled on 4 tables",          mono: false },
      { label: "Migrations",     value: "4 applied",                    mono: false },
      { label: "RLS",            value: "Enabled",                      mono: false },
    ],
  },
  {
    title: "Contracts",
    icon: Key,
    items: [
      { label: "AgentIdentity",  value: process.env.AGENT_IDENTITY_CONTRACT_ADDRESS ?? "Not deployed", mono: true },
      { label: "DecisionLedger", value: process.env.DECISION_LEDGER_CONTRACT_ADDRESS ?? "Not deployed", mono: true },
      { label: "Standard",       value: "ERC-8004 (Soul-bound)",        mono: false },
      { label: "Language",       value: "Solidity 0.8.24",              mono: false },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">YieldMind configuration and deployment info</p>
      </div>

      <div className="space-y-4">
        {CONFIG_SECTIONS.map((section) => (
          <div key={section.title} className="card">
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="w-4 h-4 text-text-muted" />
              <h2 className="text-sm font-semibold text-text-primary">{section.title}</h2>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                  <span className="text-xs text-text-muted">{item.label}</span>
                  <span className={`text-xs text-text-primary max-w-[60%] text-right truncate ${item.mono ? "font-mono" : "font-medium"}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hackathon info */}
      <div className="card border-brand-cyan/20 bg-brand-cyan/5">
        <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Hackathon</p>
        <p className="text-sm font-bold text-text-primary mb-1">The Turing Test Hackathon — AI x RWA Track</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          YieldMind demonstrates on-chain benchmarking of AI decisions, ERC-8004 agent identity,
          and radical transparency via live-streamed agent execution on Mantle Network.
        </p>
        <a
          href="https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-brand-cyan hover:text-brand-cyan/80 font-medium transition-colors"
        >
          View on DoraHacks ↗
        </a>
      </div>
    </div>
  )
}
