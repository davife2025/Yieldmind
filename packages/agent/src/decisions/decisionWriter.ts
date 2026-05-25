import { createServerClient } from "@yieldmind/db"
import type { AgentDecisionPayload } from "../types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Decision Writer
// Persists every AI decision to Supabase
// tx_hash is populated in Session 3 once contracts are deployed
// ─────────────────────────────────────────────────────────────

export async function writeDecision(payload: AgentDecisionPayload): Promise<string | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("agent_decisions")
    .insert({
      agent_id: payload.agentId,
      type: payload.type,
      reasoning: payload.reasoning,
      action_taken: payload.actionTaken ?? null,
      tx_hash: payload.txHash ?? null,
      status: payload.status,
      asset_id: payload.assetId ?? null,
      value_delta_usd: payload.valueDeltaUsd ?? null,
      apy_delta: payload.apyDelta ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[DecisionWriter] Failed to write decision:", error.message)
    return null
  }

  console.log(`[DecisionWriter] Wrote decision ${data.id} (${payload.type})`)

  // Update agent decision count
  await supabase.rpc("increment_decisions_count", { agent_id: payload.agentId })

  return data.id
}

export async function updateDecisionStatus(
  decisionId: string,
  status: "confirmed" | "failed",
  txHash?: string
): Promise<void> {
  const supabase = createServerClient()

  await supabase
    .from("agent_decisions")
    .update({ status, tx_hash: txHash ?? null })
    .eq("id", decisionId)
}

export async function writeMultipleDecisions(
  payloads: AgentDecisionPayload[]
): Promise<string[]> {
  const ids: string[] = []
  for (const payload of payloads) {
    const id = await writeDecision(payload)
    if (id) ids.push(id)
  }
  return ids
}
