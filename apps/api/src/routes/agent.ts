import { Router, type Request, type Response } from "express"
import { createServerClient } from "@yieldmind/db"
import { z } from "zod"

const router = Router()

const DEMO_WALLET = "0xDemoWallet0000000000000000000000000001"

// ── GET /api/v1/agent/status ───────────────────────────────────────────────

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const supabase = createServerClient()

    const { data: lastDecision } = await supabase
      .from("agent_decisions")
      .select("created_at, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: decisions24h }, { count: activeAlerts }, { count: totalDecisions }] =
      await Promise.all([
        supabase.from("agent_decisions").select("*", { count: "exact", head: true }).gte("created_at", yesterday),
        supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("agent_decisions").select("*", { count: "exact", head: true }),
      ])

    const lastRunAt       = lastDecision?.created_at ?? null
    const pollIntervalMs  = 30 * 60 * 1000
    const nextRunAt       = lastRunAt
      ? new Date(new Date(lastRunAt).getTime() + pollIntervalMs).toISOString()
      : null
    const isOverdue       = lastRunAt
      ? Date.now() - new Date(lastRunAt).getTime() > pollIntervalMs * 1.5
      : false

    res.json({
      status:             isOverdue ? "overdue" : "active",
      lastRunAt,
      nextRunAt,
      pollIntervalMinutes: 30,
      model:              "moonshotai/Kimi-K2-Instruct",
      network:            "Mantle Testnet",
      chainId:            5003,
      decisions:          { total: totalDecisions ?? 0, last24h: decisions24h ?? 0 },
      activeAlerts:       activeAlerts ?? 0,
    })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── POST /api/v1/agent/run ─────────────────────────────────────────────────

router.post("/run", async (_req: Request, res: Response) => {
  try {
    const supabase = createServerClient()

    const { data: agent } = await supabase
      .from("agents")
      .select("id, total_value_usd, weighted_apy")
      .eq("wallet_address", DEMO_WALLET)
      .single()

    if (!agent) {
      return res.status(404).json({ error: "Agent not found. Run: supabase db seed" })
    }

    // Import agent modules
    const [
      { fetchAllYields, storeYieldSnapshots, detectYieldOpportunities, detectPortfolioDrift },
      { runRiskEngine, storeRiskAlerts },
      { reasonAboutYieldOpportunity, reasonAboutRisk, reasonAboutRebalance },
      { writeDecision },
      { loadPortfolioSnapshot },
      { calcWeightedAPY },
    ] = await Promise.all([
      import("@yieldmind/agent/src/scanner/yieldScanner"),
      import("@yieldmind/agent/src/risk/riskEngine"),
      import("@yieldmind/agent/src/claude/reasoningEngine"),
      import("@yieldmind/agent/src/decisions/decisionWriter"),
      import("@yieldmind/agent/src/scanner/portfolioState"),
      import("@yieldmind/shared"),
    ])

    let decisionsWritten = 0, rebalancesTriggered = 0

    // 1. Yield snapshots
    const yields    = await fetchAllYields()
    await storeYieldSnapshots(yields)
    const priceMap: Record<string, number> = {
      USDY: 1.0, USDe: 1.0,
      mETH: yields.find(y => y.assetId === "mETH")?.priceUsd ?? 3524,
      fBTC: yields.find(y => y.assetId === "fBTC")?.priceUsd ?? 61130,
    }

    const portfolio = await loadPortfolioSnapshot()
    if (!portfolio) return res.status(500).json({ error: "Portfolio unavailable" })

    // 2. Yield opportunities → Claude
    const yieldOpps = await detectYieldOpportunities(yields)
    for (const opp of yieldOpps.filter(o => o.significance !== "MINOR")) {
      let reasoning = `${opp.assetId} APY ${opp.direction === "UP" ? "increased" : "decreased"} ${Math.abs(opp.delta).toFixed(3)}%.`
      let action = "Monitoring."
      try {
        const r = await reasonAboutYieldOpportunity(portfolio, opp)
        reasoning = r.reasoning; action = r.action
      } catch { /* use fallback */ }
      const id = await writeDecision({ agentId: agent.id, type: "YIELD", reasoning, actionTaken: action, status: "confirmed", assetId: opp.assetId, apyDelta: opp.delta })
      if (id) decisionsWritten++
    }

    // 3. Risk engine → Claude
    const riskSignals = await runRiskEngine(agent.id)
    if (riskSignals.length) {
      await storeRiskAlerts(agent.id, riskSignals)
      for (const signal of riskSignals.filter(s => s.severity !== "LOW")) {
        let reasoning = signal.message
        let action    = ["HIGH","CRITICAL"].includes(signal.severity) ? "Reducing exposure." : "Monitoring."
        try {
          const r = await reasonAboutRisk(portfolio, signal)
          reasoning = r.reasoning; action = r.action
        } catch { /* use fallback */ }
        const id = await writeDecision({ agentId: agent.id, type: "RISK", reasoning, actionTaken: action, status: "confirmed", assetId: signal.assetId ?? undefined })
        if (id) decisionsWritten++
      }
    }

    // 4. Drift → Claude → update positions
    const drifted = await detectPortfolioDrift(agent.id)
    if (drifted.length) {
      let reasoning = `Drift: ${drifted.map(d => `${d.assetId} ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}%`).join(", ")}`
      let action    = `Rebalancing: ${drifted.map(d => d.assetId).join(", ")}`
      try {
        const r = await reasonAboutRebalance(portfolio, drifted)
        reasoning = r.reasoning; action = r.action
      } catch { /* use fallback */ }

      const id = await writeDecision({ agentId: agent.id, type: "REBALANCE", reasoning, actionTaken: action, status: "confirmed" })
      if (id) decisionsWritten++
      rebalancesTriggered++

      // Update positions
      const fromEntry = drifted.reduce((a, b) => a.drift > b.drift ? a : b)
      const toEntry   = drifted.reduce((a, b) => a.drift < b.drift ? a : b)
      if (fromEntry.assetId !== toEntry.assetId) {
        const { data: positions } = await supabase.from("positions").select("asset_id, balance, value_usd").eq("agent_id", agent.id)
        if (positions?.length) {
          const fp = positions.find(p => p.asset_id === fromEntry.assetId)!
          const tp = positions.find(p => p.asset_id === toEntry.assetId)!
          if (fp && tp) {
            const amt = Math.min(Math.abs(fromEntry.drift / 100) * fromEntry.valueUsd, fp.value_usd * 0.99)
            const fP  = priceMap[fromEntry.assetId] ?? 1
            const tP  = priceMap[toEntry.assetId]   ?? 1
            const nFv = Math.max(0, fp.value_usd - amt)
            const nTv = tp.value_usd + amt
            const tot = positions.reduce((s, p) => s + (p.asset_id === fromEntry.assetId ? nFv : p.asset_id === toEntry.assetId ? nTv : p.value_usd), 0)
            await Promise.all([
              supabase.from("positions").update({ balance: +Math.max(0, fp.balance - amt/fP).toFixed(8), value_usd: +nFv.toFixed(4), allocation_pct: tot > 0 ? +((nFv/tot)*100).toFixed(4) : 0, updated_at: new Date().toISOString() }).eq("agent_id", agent.id).eq("asset_id", fromEntry.assetId),
              supabase.from("positions").update({ balance: +(tp.balance + amt/tP).toFixed(8), value_usd: +nTv.toFixed(4), allocation_pct: tot > 0 ? +((nTv/tot)*100).toFixed(4) : 0, updated_at: new Date().toISOString() }).eq("agent_id", agent.id).eq("asset_id", toEntry.assetId),
            ])
          }
        }
      }
    }

    // 5. Update weighted APY
    const { data: fp } = await supabase.from("positions").select("value_usd, asset_id").eq("agent_id", agent.id)
    const newApy = calcWeightedAPY((fp ?? []).map(p => ({ value_usd: p.value_usd, apy: yields.find(y => y.assetId === p.asset_id)?.apy ?? 0 })))
    await supabase.from("agents").update({ weighted_apy: +newApy.toFixed(4) }).eq("id", agent.id)

    return res.json({ success: true, decisionsWritten, riskSignals: riskSignals.length, yieldOpportunities: yieldOpps.length, rebalancesTriggered, ranAt: new Date().toISOString() })
  } catch (err: unknown) {
    console.error("[agent/run]", err)
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// ── GET /api/v1/agent/decisions ────────────────────────────────────────────

router.get("/decisions", async (req: Request, res: Response) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit as string ?? "20"), 100)
    const offset = parseInt(req.query.offset as string ?? "0")
    const type   = req.query.type as string | undefined

    const supabase = createServerClient()
    let query = supabase
      .from("agent_decisions")
      .select("id, type, reasoning, action_taken, tx_hash, status, asset_id, value_delta_usd, apy_delta, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) query = query.eq("type", type.toUpperCase())

    const { data, error, count } = await query
    if (error) throw error

    res.json({ decisions: data ?? [], total: count ?? 0, limit, offset })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── GET /api/v1/agent/profile ──────────────────────────────────────────────

router.get("/profile", async (req: Request, res: Response) => {
  try {
    const wallet   = (req.query.wallet as string) ?? DEMO_WALLET
    const supabase = createServerClient()

    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, wallet_address, nft_token_id, name, total_value_usd, weighted_apy, decisions_count, created_at")
      .eq("wallet_address", wallet)
      .single()

    if (error || !agent) return res.status(404).json({ error: "Agent not found" })

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: decisionsToday } = await supabase
      .from("agent_decisions")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .gte("created_at", yesterday)

    let onChainDecisions = 0
    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      onChainDecisions = await getMantleWriter().getTotalOnChainDecisions()
    } catch { /* contracts not deployed */ }

    res.json({
      id:              agent.id,
      walletAddress:   agent.wallet_address,
      nftTokenId:      agent.nft_token_id,
      name:            agent.name,
      totalValueUsd:   agent.total_value_usd,
      weightedApy:     agent.weighted_apy,
      decisionsCount:  agent.decisions_count,
      decisionsToday:  decisionsToday ?? 0,
      onChainDecisions,
      minted:          !!agent.nft_token_id,
      createdAt:       agent.created_at,
    })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── POST /api/v1/agent/mint ────────────────────────────────────────────────

const MintSchema = z.object({
  walletAddress: z.string().min(10),
  agentName:     z.string().min(1).max(50),
})

router.post("/mint", async (req: Request, res: Response) => {
  const parsed = MintSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { walletAddress, agentName } = parsed.data
  const supabase = createServerClient()

  try {
    let { data: agent } = await supabase
      .from("agents")
      .select("id, nft_token_id")
      .eq("wallet_address", walletAddress)
      .single()

    if (!agent) {
      const { data: newAgent, error } = await supabase
        .from("agents")
        .insert({ wallet_address: walletAddress, name: agentName })
        .select("id, nft_token_id")
        .single()
      if (error) throw error
      agent = newAgent
    }

    if (agent!.nft_token_id) {
      return res.status(409).json({ error: "Already minted", tokenId: agent!.nft_token_id })
    }

    let tokenId = "PENDING"
    let txHash: string | null = null
    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      const result = await getMantleWriter().mintAgentIdentity(walletAddress, agentName)
      tokenId = result.tokenId
      txHash  = result.txHash
    } catch {
      const { count } = await supabase.from("agents").select("*", { count: "exact", head: true })
      tokenId = String(count ?? 1)
    }

    await supabase.from("agents").update({ nft_token_id: tokenId }).eq("id", agent!.id)
    await supabase.from("agent_decisions").insert({ agent_id: agent!.id, type: "INFO", reasoning: `ERC-8004 Agent Identity NFT registered. Token ID: #${tokenId}.`, action_taken: `Agent Identity NFT #${tokenId} registered`, tx_hash: txHash, status: "confirmed" })

    return res.json({ success: true, tokenId, txHash, explorerUrl: txHash ? `https://explorer.testnet.mantle.xyz/tx/${txHash}` : null })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── POST /api/v1/agent/rebalance ───────────────────────────────────────────

const RebalanceSchema = z.object({
  fromAsset:  z.enum(["USDY", "mETH", "USDe", "fBTC"]),
  toAsset:    z.enum(["USDY", "mETH", "USDe", "fBTC"]),
  amountUsd:  z.number().positive(),
  agentId:    z.string().uuid(),
  reasoning:  z.string().optional(),
})

router.post("/rebalance", async (req: Request, res: Response) => {
  const parsed = RebalanceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { fromAsset, toAsset, amountUsd, agentId, reasoning } = parsed.data
  const supabase = createServerClient()

  try {
    const { data: decision } = await supabase
      .from("agent_decisions")
      .insert({ agent_id: agentId, type: "REBALANCE", reasoning: reasoning ?? `Rebalance: ${fromAsset} → ${toAsset}`, action_taken: `Shifted $${amountUsd.toLocaleString()} ${fromAsset} → ${toAsset}`, status: "pending", asset_id: fromAsset })
      .select("id").single()

    // Fetch prices
    const priceMap: Record<string, number> = { USDY: 1.0, USDe: 1.0, mETH: 3524, fBTC: 61130 }
    try {
      const { getAllAssetPrices } = await import("@yieldmind/agent/src/bybit/client")
      const prices = await getAllAssetPrices()
      priceMap.mETH = prices.ETH
      priceMap.fBTC = prices.BTC
    } catch { /* use defaults */ }

    // Update positions
    const { data: positions } = await supabase.from("positions").select("asset_id, balance, value_usd").eq("agent_id", agentId)
    if (positions?.length) {
      const fp = positions.find(p => p.asset_id === fromAsset)
      const tp = positions.find(p => p.asset_id === toAsset)
      if (fp && tp) {
        const actual = Math.min(amountUsd, fp.value_usd * 0.99)
        const nFv    = Math.max(0, fp.value_usd - actual)
        const nTv    = tp.value_usd + actual
        const tot    = positions.reduce((s, p) => s + (p.asset_id === fromAsset ? nFv : p.asset_id === toAsset ? nTv : p.value_usd), 0)
        await Promise.all([
          supabase.from("positions").update({ balance: +Math.max(0, fp.balance - actual/(priceMap[fromAsset]??1)).toFixed(8), value_usd: +nFv.toFixed(4), allocation_pct: tot>0?+((nFv/tot)*100).toFixed(4):0, updated_at: new Date().toISOString() }).eq("agent_id", agentId).eq("asset_id", fromAsset),
          supabase.from("positions").update({ balance: +(tp.balance + actual/(priceMap[toAsset]??1)).toFixed(8), value_usd: +nTv.toFixed(4), allocation_pct: tot>0?+((nTv/tot)*100).toFixed(4):0, updated_at: new Date().toISOString() }).eq("agent_id", agentId).eq("asset_id", toAsset),
        ])
      }
    }

    // On-chain log
    let txHash: string | null = null
    try {
      const { getMantleWriter } = await import("@yieldmind/agent/src/mantle/mantleWriter")
      const { data: ag } = await supabase.from("agents").select("wallet_address, nft_token_id").eq("id", agentId).single()
      if (ag?.nft_token_id) {
        txHash = await getMantleWriter().logDecision({ agentId, type: "REBALANCE", reasoning: reasoning ?? "", assetId: fromAsset, status: "confirmed" }, ag.nft_token_id, ag.wallet_address)
      }
    } catch { /* contracts not deployed */ }

    await supabase.from("agent_decisions").update({ status: "confirmed", tx_hash: txHash }).eq("id", decision!.id)
    return res.json({ success: true, decisionId: decision!.id, txHash, explorerUrl: txHash ? `https://explorer.testnet.mantle.xyz/tx/${txHash}` : null })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
