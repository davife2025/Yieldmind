import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// GET /api/health
// Used by Vercel health checks and the demo to verify stack is live

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {}

  // Check Supabase
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from("agents").select("id").limit(1)
    checks.supabase = error ? "error" : "ok"
  } catch {
    checks.supabase = "error"
  }

  // Check env vars
  checks.huggingface   = process.env.HUGGINGFACE_TOKEN   ? "ok" : "error"
  checks.bybit       = process.env.BYBIT_API_KEY        ? "ok" : "error"
  checks.agentNFT    = process.env.AGENT_IDENTITY_CONTRACT_ADDRESS ? "ok" : "error"
  checks.decisionLedger = process.env.DECISION_LEDGER_CONTRACT_ADDRESS ? "ok" : "error"

  const allOk = Object.values(checks).every(v => v === "ok")

  return NextResponse.json(
    {
      status:    allOk ? "healthy" : "degraded",
      checks,
      app:       "YieldMind",
      network:   "Mantle Testnet",
      chainId:   5003,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 207 }
  )
}
