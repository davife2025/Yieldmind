import { Router, type Request, type Response } from "express"
import { createServerClient } from "@yieldmind/db"

const router = Router()

router.get("/", async (_req: Request, res: Response) => {
  const checks: Record<string, "ok" | "error"> = {}
  const start = Date.now()

  // Supabase
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from("agents").select("id").limit(1)
    checks.supabase = error ? "error" : "ok"
  } catch {
    checks.supabase = "error"
  }

  // Env vars
  checks.huggingface      = process.env.HUGGINGFACE_TOKEN               ? "ok" : "error"
  checks.bybit          = process.env.BYBIT_API_KEY                    ? "ok" : "error"
  checks.agentNFT       = process.env.AGENT_IDENTITY_CONTRACT_ADDRESS  ? "ok" : "error"
  checks.decisionLedger = process.env.DECISION_LEDGER_CONTRACT_ADDRESS ? "ok" : "error"

  const allOk = Object.values(checks).every(v => v === "ok")

  res.status(allOk ? 200 : 207).json({
    status:    allOk ? "healthy" : "degraded",
    checks,
    app:       "YieldMind API",
    version:   "1.0.0",
    network:   "Mantle Testnet",
    chainId:   5003,
    uptimeMs:  process.uptime() * 1000,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  })
})

export default router
