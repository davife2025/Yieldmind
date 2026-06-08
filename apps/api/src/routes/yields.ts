import { Router, type Request, type Response } from "express"
import { createServerClient } from "@yieldmind/db"
import { z } from "zod"

const router = Router()

// ── GET /api/v1/yields ─────────────────────────────────────────────────────
// APY history for chart — last 6 hours, 30-min intervals

router.get("/", async (req: Request, res: Response) => {
  try {
    const hours    = Math.min(parseInt(req.query.hours as string ?? "6"), 48)
    const supabase = createServerClient()
    const since    = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data: snapshots, error } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy, price_usd, timestamp")
      .gte("timestamp", since)
      .order("timestamp", { ascending: true })

    if (error || !snapshots?.length) {
      // Return generated mock data
      return res.json(Array.from({ length: 12 }, (_, i) => {
        const t = new Date(Date.now() - (11 - i) * 30 * 60 * 1000)
        return {
          time: t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          USDY: +(5.15 + Math.random() * 0.12).toFixed(3),
          mETH: +(4.70 + Math.random() * 0.15).toFixed(3),
          USDe: +(8.80 + Math.random() * 0.30).toFixed(3),
          fBTC: +(3.05 + Math.random() * 0.10).toFixed(3),
        }
      }))
    }

    // Group into 30-min buckets
    const buckets: Record<string, Record<string, number | string>> = {}
    for (const s of snapshots) {
      const d = new Date(s.timestamp)
      d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0)
      const key = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      if (!buckets[key]) buckets[key] = { time: key }
      buckets[key][s.asset_id] = s.apy
    }

    res.json(Object.values(buckets))
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── GET /api/v1/yields/latest ──────────────────────────────────────────────

router.get("/latest", async (_req: Request, res: Response) => {
  try {
    const supabase = createServerClient()
    const assets   = ["USDY", "mETH", "USDe", "fBTC"]

    const { data } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy, price_usd, timestamp")
      .in("asset_id", assets)
      .order("timestamp", { ascending: false })
      .limit(assets.length * 2)

    const latest: Record<string, { apy: number; price_usd: number; timestamp: string }> = {}
    for (const s of data ?? []) {
      if (!latest[s.asset_id]) latest[s.asset_id] = { apy: s.apy, price_usd: s.price_usd, timestamp: s.timestamp }
    }

    res.json(latest)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export { router as yieldsRouter }

// ── Alerts routes ──────────────────────────────────────────────────────────

const alertsRouter = Router()

// GET /api/v1/alerts
alertsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const supabase  = createServerClient()
    const resolved  = req.query.resolved === "true"
    const limit     = Math.min(parseInt(req.query.limit as string ?? "20"), 100)

    let query = supabase
      .from("risk_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (req.query.resolved !== undefined) {
      query = query.eq("resolved", resolved)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({ alerts: data ?? [] })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// PATCH /api/v1/alerts/:id — resolve an alert
alertsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id }   = req.params
    const supabase = createServerClient()

    const { error } = await supabase
      .from("risk_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export { alertsRouter }
