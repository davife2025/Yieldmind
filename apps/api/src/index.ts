import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import { requestLogger }         from "./middleware/logger"
import { conditionalAuth }       from "./middleware/auth"
import agentRoutes               from "./routes/agent"
import positionsRoutes           from "./routes/positions"
import { yieldsRouter, alertsRouter } from "./routes/yields"
import pricesRoutes              from "./routes/prices"
import healthRoutes              from "./routes/health"
import { startCron, getCronStatus } from "./jobs/agentCron"

// ─────────────────────────────────────────────────────────────
// YieldMind — Standalone API Server
//
// Runs as a persistent Node.js process.
// Exposes REST endpoints + runs the AI agent cron internally.
// Deploy to Railway, Fly.io, Render, or any VPS.
//
// PORT:    process.env.PORT (default 4000)
// ─────────────────────────────────────────────────────────────

const app  = express()
const PORT = parseInt(process.env.PORT ?? "4000", 10)

// ── Security & parsing ─────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? [
    "http://localhost:3000",
    "https://yieldmind.vercel.app",
  ],
  credentials: true,
}))
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests — please slow down" },
})
app.use("/api/", limiter)

// ── Request logging ────────────────────────────────────────────────────────
app.use(requestLogger)

// ── Auth (API key on protected routes) ────────────────────────────────────
app.use(conditionalAuth)

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/health",              healthRoutes)
app.use("/api/v1/agent",        agentRoutes)
app.use("/api/v1/positions",    positionsRoutes)
app.use("/api/v1/yields",       yieldsRouter)
app.use("/api/v1/alerts",       alertsRouter)
app.use("/api/v1/prices",       pricesRoutes)
app.use("/api/v1/health",       healthRoutes)

// Cron status endpoint (no auth — monitoring friendly)
app.get("/api/v1/cron/status", (_req, res) => {
  res.json(getCronStatus())
})

// ── API docs (root) ────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name:    "YieldMind API",
    version: "1.0.0",
    docs:    "https://github.com/your-org/yieldmind#api",
    endpoints: {
      health:     "GET  /health",
      cron:       "GET  /api/v1/cron/status",
      agent: {
        status:    "GET  /api/v1/agent/status",
        run:       "POST /api/v1/agent/run",
        decisions: "GET  /api/v1/agent/decisions",
        profile:   "GET  /api/v1/agent/profile?wallet=0x...",
        mint:      "POST /api/v1/agent/mint",
        rebalance: "POST /api/v1/agent/rebalance",
      },
      positions: {
        list:      "GET   /api/v1/positions",
        stats:     "GET   /api/v1/positions/stats",
        update:    "PATCH /api/v1/positions",
      },
      yields: {
        history:   "GET /api/v1/yields?hours=6",
        latest:    "GET /api/v1/yields/latest",
      },
      alerts: {
        list:      "GET   /api/v1/alerts",
        resolve:   "PATCH /api/v1/alerts/:id",
      },
      prices:     "GET  /api/v1/prices",
    },
  })
})

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" })
})

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API Error]", err)
  res.status(500).json({ error: "Internal server error", message: err instanceof Error ? err.message : String(err) })
})

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("🧠  YieldMind API Server")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`   Port:      ${PORT}`)
  console.log(`   Network:   Mantle Testnet (chainId 5003)`)
  console.log(`   AI Model:  moonshotai/Kimi-K2-Instruct (HuggingFace)`)
  console.log(`   HF Token:  ${process.env.HUGGINGFACE_TOKEN ? "✓ set" : "✗ MISSING — AI reasoning disabled"}`)
  console.log(`   Auth:      ${process.env.YIELDMIND_API_KEY ? "enabled" : "disabled (dev mode)"}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  // Start the agent cron job
  startCron()
})

export default app
