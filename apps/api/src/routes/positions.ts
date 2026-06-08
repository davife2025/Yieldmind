import { Router, type Request, type Response } from "express"
import { createServerClient } from "@yieldmind/db"
import { z } from "zod"

const router = Router()
const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

const FALLBACK_POSITIONS = [
  { asset_id: "USDY", balance: 124500, value_usd: 124500, allocation_pct: 26.22, target_allocation_pct: 25, apy: 5.23, trend: 0.04 },
  { asset_id: "mETH", balance: 42.18,  value_usd: 148630, allocation_pct: 31.30, target_allocation_pct: 32, apy: 4.81, trend: 0.11 },
  { asset_id: "USDe", balance: 89200,  value_usd: 89200,  allocation_pct: 18.79, target_allocation_pct: 18, apy: 8.94, trend: -0.07 },
  { asset_id: "fBTC", balance: 1.84,   value_usd: 112480, allocation_pct: 23.69, target_allocation_pct: 25, apy: 3.12, trend: 0.22 },
]

// ── GET /api/v1/positions ──────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const wallet   = (req.query.wallet as string) ?? DEMO_WALLET
    const supabase = createServerClient()

    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("wallet_address", wallet)
      .single()

    if (!agent) return res.json(FALLBACK_POSITIONS)

    const { data: positions, error } = await supabase
      .from("positions")
      .select("asset_id, balance, value_usd, allocation_pct, target_allocation_pct")
      .eq("agent_id", agent.id)

    if (error || !positions?.length) return res.json(FALLBACK_POSITIONS)

    // Get latest APY per asset
    const assetIds = positions.map(p => p.asset_id)
    const { data: snapshots } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy, timestamp")
      .in("asset_id", assetIds)
      .order("timestamp", { ascending: false })
      .limit(assetIds.length * 2)

    const latestApy: Record<string, number> = {}
    const prevApy:   Record<string, number> = {}
    for (const s of snapshots ?? []) {
      if (!latestApy[s.asset_id])     latestApy[s.asset_id] = s.apy
      else if (!prevApy[s.asset_id])  prevApy[s.asset_id]   = s.apy
    }

    res.json(positions.map(p => ({
      asset_id:              p.asset_id,
      balance:               p.balance,
      value_usd:             p.value_usd,
      allocation_pct:        p.allocation_pct,
      target_allocation_pct: p.target_allocation_pct,
      apy:   latestApy[p.asset_id] ?? 0,
      trend: (latestApy[p.asset_id] ?? 0) - (prevApy[p.asset_id] ?? latestApy[p.asset_id] ?? 0),
    })))
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── GET /api/v1/positions/stats ────────────────────────────────────────────

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const wallet   = (req.query.wallet as string) ?? DEMO_WALLET
    const supabase = createServerClient()

    const { data: agent } = await supabase
      .from("agents")
      .select("id, total_value_usd, weighted_apy, decisions_count")
      .eq("wallet_address", wallet)
      .single()

    if (!agent) return res.json({ totalValue: 474810, weightedApy: 5.52, dailyYield: 71.74, decisionsToday: 4, totalChange24h: 0.38 })

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { count: decisionsToday } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", today.toISOString())

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: oldSnapshots } = await supabase
      .from("yield_snapshots")
      .select("apy")
      .lte("timestamp", oneDayAgo)
      .order("timestamp", { ascending: false })
      .limit(8)

    let totalChange24h = 0
    if (oldSnapshots?.length) {
      const avgOldApy = oldSnapshots.reduce((s, r) => s + r.apy, 0) / oldSnapshots.length
      totalChange24h = agent.weighted_apy - avgOldApy
    }

    res.json({
      totalValue:     agent.total_value_usd,
      weightedApy:    agent.weighted_apy,
      dailyYield:     (agent.total_value_usd * agent.weighted_apy) / 100 / 365,
      decisionsToday: decisionsToday ?? 0,
      totalChange24h,
    })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── PATCH /api/v1/positions ────────────────────────────────────────────────

const UpdateSchema = z.object({
  agentId:    z.string().uuid(),
  fromAsset:  z.enum(["USDY", "mETH", "USDe", "fBTC"]),
  toAsset:    z.enum(["USDY", "mETH", "USDe", "fBTC"]),
  amountUsd:  z.number().positive(),
  fromPrice:  z.number().positive().optional(),
  toPrice:    z.number().positive().optional(),
})

router.patch("/", async (req: Request, res: Response) => {
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { agentId, fromAsset, toAsset, amountUsd, fromPrice = 1, toPrice = 1 } = parsed.data
  const supabase = createServerClient()

  try {
    const { data: positions } = await supabase
      .from("positions")
      .select("asset_id, balance, value_usd")
      .eq("agent_id", agentId)

    const fp = positions?.find(p => p.asset_id === fromAsset)
    const tp = positions?.find(p => p.asset_id === toAsset)
    if (!fp || !tp) return res.status(404).json({ error: "Positions not found" })

    const actual = Math.min(amountUsd, fp.value_usd * 0.99)
    const nFv    = Math.max(0, fp.value_usd - actual)
    const nTv    = tp.value_usd + actual
    const tot    = (positions ?? []).reduce((s, p) => s + (p.asset_id === fromAsset ? nFv : p.asset_id === toAsset ? nTv : p.value_usd), 0)

    await Promise.all([
      supabase.from("positions").update({ balance: +Math.max(0, fp.balance - actual/fromPrice).toFixed(8), value_usd: +nFv.toFixed(4), allocation_pct: tot>0?+((nFv/tot)*100).toFixed(4):0, updated_at: new Date().toISOString() }).eq("agent_id", agentId).eq("asset_id", fromAsset),
      supabase.from("positions").update({ balance: +(tp.balance + actual/toPrice).toFixed(8), value_usd: +nTv.toFixed(4), allocation_pct: tot>0?+((nTv/tot)*100).toFixed(4):0, updated_at: new Date().toISOString() }).eq("agent_id", agentId).eq("asset_id", toAsset),
      supabase.from("agents").update({ total_value_usd: +tot.toFixed(4) }).eq("id", agentId),
    ])

    res.json({ success: true, executed: actual, totalValue: +tot.toFixed(4) })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
