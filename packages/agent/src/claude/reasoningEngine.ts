// ─────────────────────────────────────────────────────────────
// YieldMind — AI Reasoning Engine
// Uses Kimi K2 via HuggingFace Inference API (OpenAI-compatible)
// Model: moonshotai/Kimi-K2-Instruct
// Endpoint: https://api-inference.huggingface.co/v1/chat/completions
// ─────────────────────────────────────────────────────────────

import type {
  PortfolioSnapshot,
  RiskSignal,
  YieldOpportunity,
} from "../types"

// ── Client config ──────────────────────────────────────────────────────────

const HF_BASE_URL = "https://api-inference.huggingface.co/v1"
const HF_TOKEN    = process.env.HUGGINGFACE_TOKEN ?? ""
const MODEL       = "moonshotai/Kimi-K2-Instruct"

interface ChatMessage {
  role:    "system" | "user" | "assistant"
  content: string
}

interface ReasoningResult {
  reasoning:   string
  action:      string
  confidence:  "HIGH" | "MED" | "LOW"
  apyImpact:   number
  valueImpact: number
}

// ── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are YieldMind, an autonomous AI agent managing a real-world asset (RWA) portfolio on the Mantle blockchain.

Your portfolio consists of:
- USDY (Ondo Finance) — tokenized US Treasury yield-bearing stablecoin, ~5% APY, LOW risk
- mETH (Mantle LST) — Mantle's liquid staking ETH token, ~4-5% APY, LOW risk
- USDe (Ethena) — delta-neutral synthetic dollar, ~8-10% APY, MED risk (funding rate sensitive)
- fBTC (Mantle fBTC) — Mantle-native wrapped Bitcoin with yield, ~3% APY, MED risk

Your job is to analyse market conditions, yield data, and risk signals, then make clear, data-driven decisions to optimise yield while managing risk.

DECISION GUIDELINES:
- Always prioritise capital preservation over yield maximisation
- Rebalance when drift exceeds 2.5% from target allocations
- Reduce USDe exposure when funding rates spike above 0.025% (8h)
- Consider gas costs before executing small rebalances
- Your decisions are recorded permanently on Mantle — be precise and accountable

RESPONSE FORMAT:
Respond in JSON only. No markdown, no preamble, no explanation outside JSON.
{
  "reasoning": "Clear, concise explanation of your analysis (2-3 sentences max)",
  "action": "Specific action taken or 'No action required'",
  "confidence": "HIGH | MED | LOW",
  "apyImpact": 0.0,
  "valueImpact": 0.0
}`

// ── Core inference call ────────────────────────────────────────────────────

async function callKimiK2(userPrompt: string): Promise<ReasoningResult> {
  if (!HF_TOKEN) {
    throw new Error("HUGGINGFACE_TOKEN not set — required for AI reasoning")
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: userPrompt    },
  ]

  const response = await fetch(`${HF_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:       MODEL,
      messages,
      max_tokens:  512,
      temperature: 0.3,   // low temperature for consistent, analytical output
      stream:      false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText)
    throw new Error(`Kimi K2 API error ${response.status}: ${errText}`)
  }

  const data = await response.json() as {
    choices: Array<{
      message: { content: string }
      finish_reason: string
    }>
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  const content = data.choices?.[0]?.message?.content ?? ""
  if (!content) throw new Error("Empty response from Kimi K2")

  // Strip any accidental markdown fences
  const clean = content.replace(/```json\n?|```\n?/g, "").trim()

  const parsed = JSON.parse(clean) as Partial<ReasoningResult>
  return {
    reasoning:   parsed.reasoning   ?? "Analysis complete.",
    action:      parsed.action      ?? "No action required.",
    confidence:  parsed.confidence  ?? "MED",
    apyImpact:   parsed.apyImpact   ?? 0,
    valueImpact: parsed.valueImpact ?? 0,
  }
}

// ── Fallback when Kimi K2 is unavailable ──────────────────────────────────

function buildFallback(context: string): ReasoningResult {
  return {
    reasoning:   `Automated analysis: ${context}`,
    action:      "Precautionary action taken per risk parameters.",
    confidence:  "LOW",
    apyImpact:   0,
    valueImpact: 0,
  }
}

// ── Public reasoning functions ─────────────────────────────────────────────

export async function reasonAboutRebalance(
  portfolio: PortfolioSnapshot,
  driftedPositions: Array<{ assetId: string; drift: number; valueUsd: number }>
): Promise<ReasoningResult> {
  const prompt = `
PORTFOLIO STATE:
Total Value: $${portfolio.totalValueUsd.toLocaleString()}
Weighted APY: ${portfolio.weightedApy.toFixed(2)}%

CURRENT POSITIONS:
${portfolio.positions.map(p =>
  `- ${p.assetId}: $${p.valueUsd.toLocaleString()} | ${p.allocationPct.toFixed(1)}% actual vs ${p.targetAllocationPct.toFixed(1)}% target | APY: ${p.apy.toFixed(2)}%`
).join("\n")}

DRIFT DETECTED:
${driftedPositions.map(d =>
  `- ${d.assetId}: ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}% drift ($${d.valueUsd.toLocaleString()} position)`
).join("\n")}

Analyse this drift and determine the optimal rebalance action. Consider yield differentials between assets.`

  try {
    return await callKimiK2(prompt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn("[ReasoningEngine] Kimi K2 unavailable:", msg)
    return buildFallback(`Drift detected: ${driftedPositions.map(d => `${d.assetId} ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}%`).join(", ")}`)
  }
}

export async function reasonAboutRisk(
  portfolio: PortfolioSnapshot,
  signal: RiskSignal
): Promise<ReasoningResult> {
  const affected = portfolio.positions.find(p => p.assetId === signal.assetId)

  const prompt = `
PORTFOLIO STATE:
Total Value: $${portfolio.totalValueUsd.toLocaleString()}
Weighted APY: ${portfolio.weightedApy.toFixed(2)}%

RISK SIGNAL DETECTED:
Type: ${signal.type}
Asset: ${signal.assetId ?? "Portfolio-wide"}
Severity: ${signal.severity}
Details: ${signal.message}

${affected ? `Current ${signal.assetId} position: $${affected.valueUsd.toLocaleString()} (${affected.allocationPct.toFixed(1)}% of portfolio, APY: ${affected.apy.toFixed(2)}%)` : ""}

Determine the appropriate risk mitigation action. Be specific about position size changes if needed.`

  try {
    return await callKimiK2(prompt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn("[ReasoningEngine] Kimi K2 unavailable:", msg)
    return buildFallback(`${signal.severity} risk signal on ${signal.assetId ?? "portfolio"}: ${signal.type}`)
  }
}

export async function reasonAboutYieldOpportunity(
  portfolio: PortfolioSnapshot,
  opportunity: YieldOpportunity
): Promise<ReasoningResult> {
  const prompt = `
PORTFOLIO STATE:
Total Value: $${portfolio.totalValueUsd.toLocaleString()}
Weighted APY: ${portfolio.weightedApy.toFixed(2)}%

YIELD CHANGE DETECTED:
Asset: ${opportunity.assetId}
Previous APY: ${opportunity.previousApy.toFixed(2)}%
Current APY:  ${opportunity.currentApy.toFixed(2)}%
Delta: ${opportunity.delta > 0 ? "+" : ""}${opportunity.delta.toFixed(3)}%
Significance: ${opportunity.significance}
Direction: ${opportunity.direction}

CURRENT POSITIONS:
${portfolio.positions.map(p =>
  `- ${p.assetId}: ${p.allocationPct.toFixed(1)}% (target: ${p.targetAllocationPct.toFixed(1)}%) | APY: ${p.apy.toFixed(2)}%`
).join("\n")}

Assess whether this yield change warrants portfolio action.`

  try {
    return await callKimiK2(prompt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn("[ReasoningEngine] Kimi K2 unavailable:", msg)
    return buildFallback(`${opportunity.assetId} APY ${opportunity.direction === "UP" ? "increased" : "decreased"} ${Math.abs(opportunity.delta).toFixed(3)}% (${opportunity.significance})`)
  }
}
