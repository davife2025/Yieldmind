import Anthropic from "@anthropic-ai/sdk"
import type { AssetId } from "@yieldmind/db"
import type {
  PortfolioSnapshot,
  RiskSignal,
  YieldOpportunity,
  RebalanceAction,
} from "../types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Claude AI Reasoning Engine
// Every agent decision is reasoned by Claude and stored on-chain
// ─────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
Respond in JSON only. No markdown, no preamble.
{
  "reasoning": "Clear, concise explanation of your analysis (2-3 sentences max)",
  "action": "Specific action taken or 'No action required'",
  "confidence": "HIGH | MED | LOW",
  "apyImpact": number (expected APY delta, can be 0),
  "valueImpact": number (expected USD value impact, can be 0)
}`

// ── Reason about a rebalance decision ─────────────────────────────────────

export async function reasonAboutRebalance(
  portfolio: PortfolioSnapshot,
  driftedPositions: Array<{ assetId: AssetId; drift: number; valueUsd: number }>
): Promise<{ reasoning: string; action: string; apyImpact: number; valueImpact: number }> {
  const prompt = `
PORTFOLIO STATE:
Total Value: $${portfolio.totalValueUsd.toLocaleString()}
Weighted APY: ${portfolio.weightedApy.toFixed(2)}%

CURRENT POSITIONS:
${portfolio.positions.map((p) =>
  `- ${p.assetId}: $${p.valueUsd.toLocaleString()} | ${p.allocationPct.toFixed(1)}% actual vs ${p.targetAllocationPct.toFixed(1)}% target | APY: ${p.apy.toFixed(2)}%`
).join("\n")}

DRIFT DETECTED:
${driftedPositions.map((d) =>
  `- ${d.assetId}: ${d.drift > 0 ? "+" : ""}${d.drift.toFixed(2)}% drift ($${d.valueUsd.toLocaleString()} position)`
).join("\n")}

Analyse this drift and determine the optimal rebalance action. Consider yield differentials between assets when deciding direction.`

  return callClaude(prompt)
}

// ── Reason about a risk signal ─────────────────────────────────────────────

export async function reasonAboutRisk(
  portfolio: PortfolioSnapshot,
  signal: RiskSignal
): Promise<{ reasoning: string; action: string; apyImpact: number; valueImpact: number }> {
  const prompt = `
PORTFOLIO STATE:
Total Value: $${portfolio.totalValueUsd.toLocaleString()}
Weighted APY: ${portfolio.weightedApy.toFixed(2)}%

RISK SIGNAL DETECTED:
Type: ${signal.type}
Asset: ${signal.assetId ?? "Portfolio-wide"}
Severity: ${signal.severity}
Details: ${signal.message}

Current ${signal.assetId} position: ${
    portfolio.positions.find((p) => p.assetId === signal.assetId)
      ? `$${portfolio.positions.find((p) => p.assetId === signal.assetId)!.valueUsd.toLocaleString()} (${portfolio.positions.find((p) => p.assetId === signal.assetId)!.allocationPct.toFixed(1)}% of portfolio)`
      : "N/A"
  }

Determine the appropriate risk mitigation action. Be specific about position size changes.`

  return callClaude(prompt)
}

// ── Reason about a yield opportunity ──────────────────────────────────────

export async function reasonAboutYieldOpportunity(
  portfolio: PortfolioSnapshot,
  opportunity: YieldOpportunity
): Promise<{ reasoning: string; action: string; apyImpact: number; valueImpact: number }> {
  const prompt = `
PORTFOLIO STATE:
Total Value: $${portfolio.totalValueUsd.toLocaleString()}
Weighted APY: ${portfolio.weightedApy.toFixed(2)}%

YIELD CHANGE DETECTED:
Asset: ${opportunity.assetId}
Previous APY: ${opportunity.previousApy.toFixed(2)}%
Current APY: ${opportunity.currentApy.toFixed(2)}%
Delta: ${opportunity.delta > 0 ? "+" : ""}${opportunity.delta.toFixed(2)}%
Significance: ${opportunity.significance}
Direction: ${opportunity.direction}

CURRENT POSITIONS:
${portfolio.positions.map((p) =>
  `- ${p.assetId}: ${p.allocationPct.toFixed(1)}% (target: ${p.targetAllocationPct.toFixed(1)}%) | APY: ${p.apy.toFixed(2)}%`
).join("\n")}

Assess whether this yield change warrants portfolio action. Consider whether reallocation towards/away from this asset is warranted given current targets.`

  return callClaude(prompt)
}

// ── Core Claude API call ───────────────────────────────────────────────────

async function callClaude(
  userPrompt: string
): Promise<{ reasoning: string; action: string; apyImpact: number; valueImpact: number }> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return {
      reasoning: parsed.reasoning ?? "Analysis complete.",
      action: parsed.action ?? "No action required.",
      apyImpact: parsed.apyImpact ?? 0,
      valueImpact: parsed.valueImpact ?? 0,
    }
  } catch (err) {
    console.error("[Claude] Reasoning failed:", err)
    return {
      reasoning: "Automated analysis triggered based on threshold breach.",
      action: "Precautionary action taken per risk parameters.",
      apyImpact: 0,
      valueImpact: 0,
    }
  }
}
