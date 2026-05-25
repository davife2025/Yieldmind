# YieldMind — Judge Demo Script
## The Turing Test Hackathon · AI x RWA Track
### Target duration: 3 minutes

---

## PRE-DEMO CHECKLIST (5 minutes before)

- [ ] App running at localhost:3000 (or live Vercel URL)
- [ ] Supabase seed data confirmed (`supabase studio` → check agents table)
- [ ] Mantle testnet wallet funded with MNT
- [ ] `.env.local` has all keys (Anthropic, Bybit, Supabase)
- [ ] Browser: Chrome, wallet extension connected
- [ ] Screen: 1920×1080, zoom 90%, dark mode

---

## THE PITCH LINE (say this first — 15 seconds)

> "YieldMind is an autonomous AI agent that manages a real-world asset portfolio on Mantle.
> Every yield opportunity, every risk signal, every rebalance decision — reasoned by Claude,
> recorded on-chain, verifiable by anyone. We're not just building a dashboard.
> We're building the first AI agent with a permanent reputation on Mantle."

---

## DEMO FLOW

### [0:00 – 0:30] Dashboard — First Impression

**Navigate to:** `/dashboard`

**Say:**
> "This is the live portfolio. Four RWA assets — USDY from Ondo, mETH from Mantle's
> own LST, USDe from Ethena, and fBTC. $474K under management, weighted APY of 5.52%.
> The AI agent is polling every 30 minutes. Everything you see is live from Supabase."

**Point out:**
- The animated counter on Total Portfolio Value
- The live ping indicator (top left — Agent Active)
- The portfolio value area chart — click 7D range

---

### [0:30 – 1:00] Positions + AI Rebalancing

**Navigate to:** `/positions`

**Say:**
> "Here's where the AI earns its keep. Every position has a target allocation.
> When actual drift exceeds 2.5%, the agent triggers a rebalance.
> Watch this — USDY is currently overweight by 1.22% versus its 25% target."

**Click:** "Rebalance" button on USDY row (hover to reveal)

**In the modal:**
> "The agent proposes shifting $14,940 from USDY to mETH — and here's the key:
> it shows you exactly why. The AI reasoning isn't hidden. You can read it,
> audit it, and verify it. Expected APY improvement: +0.42%."

**Click Approve** → show the success state with tx hash

> "That transaction just got logged to our DecisionLedger contract on Mantle testnet.
> Permanently. Immutably. Anyone can verify it."

---

### [1:00 – 1:30] Agent Decision Feed — Radical Transparency

**Navigate to:** `/agent`

**Say:**
> "This is what separates YieldMind from every other yield optimizer.
> Every single decision the agent makes is here — with full Claude AI reasoning."

**Click to expand** the first REBALANCE decision card

> "The reasoning hash is stored on-chain. The full text is in Supabase.
> Click 'Verify on Mantle' — it opens the actual transaction on Mantle Explorer.
> This is on-chain benchmarking of AI. The first of its kind in Web3."

**Point to Agent Identity card:**
> "This is the ERC-8004 identity NFT. Soul-bound to the agent's wallet.
> 24 decisions made, reputation score 156, climbing.
> On-chain achievements unlocked as the agent performs. The agent has a reputation now."

---

### [1:30 – 2:00] Risk Engine

**Navigate to:** `/alerts`

**Say:**
> "The risk engine runs in parallel. Right now there's one active alert —
> USDe funding rate elevated above threshold. The agent already acted:
> reduced exposure by 8%, logged to Supabase and Mantle, decision recorded."

**Show the MED badge, the message, the timestamp**

> "This isn't manual. The agent detected the funding rate via Bybit API,
> passed it to Claude for reasoning, wrote the decision, and stored the alert —
> all without human intervention."

**Click Run Agent Now** (in AgentControls)

> "Watch this — triggering a fresh agent run right now. Live, in front of you."

**Wait 2–3 seconds, show result summary:**
> "Done. Two yield opportunities detected, one risk check, one decision written.
> All in under 3 seconds."

---

### [2:00 – 2:30] On-Chain Architecture

**Say:**
> "Let me show you what's actually deployed on Mantle Testnet."

**Open:** `https://explorer.testnet.mantle.xyz`
**Paste:** AgentIdentity contract address

> "AgentIdentity.sol — our ERC-8004 implementation.
> DecisionLedger.sol — the immutable log.
> Every agent decision in this demo mapped to a transaction on this chain."

**Back to dashboard, point to the hero gradient:**
> "The AI Awakening phase of this hackathon is about agents executing live.
> YieldMind does exactly that — and every execution is provable."

---

### [2:30 – 3:00] Close

**Navigate back to:** `/dashboard`

**Say:**
> "Three things no other submission has:
>
> One — on-chain benchmarking. Every AI decision hashed and recorded on Mantle,
> not in a server log.
>
> Two — ERC-8004 agent identity. The agent builds a reputation over time.
> It's not just code running. It's an agent with history.
>
> Three — full AI transparency. Every rebalance, every risk action — you can
> read the Claude reasoning, verify the Mantle transaction, and audit the outcome.
>
> YieldMind isn't a prototype. It's infrastructure for how autonomous AI agents
> manage real-world assets in Web3."

---

## EXPECTED JUDGE QUESTIONS

**"How is this different from a regular yield aggregator?"**
> "A yield aggregator executes rules. YieldMind reasons. Every decision goes through
> Claude — it gets the portfolio state, the risk signal, and generates a natural-language
> justification before acting. The reasoning is stored. The action is verifiable."

**"Is the AI actually making decisions or is it just a wrapper?"**
> "The agent calls Claude with full portfolio context — balances, APYs, drift percentages,
> funding rates. Claude returns structured JSON with reasoning, action, and expected impact.
> We don't prompt-engineer around the outcome. The agent can recommend no action,
> and often does."

**"What's ERC-8004? Is that real?"**
> "ERC-8004 is an agent identity standard being developed for the agentic Web3 ecosystem.
> Our implementation extends ERC-721 with soul-binding, on-chain decision logs,
> reputation scoring, and achievements — all the primitives you need to give
> an AI agent a verifiable track record."

**"Can it lose money?"**
> "The agent is risk-conservative by design. It prefers stability over yield,
> won't rebalance into high-risk assets above 25% allocation, and backs off
> USDe exposure the moment funding rates spike. Downside protection is a
> first-class constraint in the Claude system prompt."

**"Why Mantle?"**
> "Mantle is the only L2 with USDY and mETH natively — we're not bridging assets,
> we're building on the infrastructure that already has institutional RWA liquidity.
> Plus Bybit integration means our agent has real order book data for the assets
> it manages."

---

## BACKUP PLAN (if live demo breaks)

1. **Supabase down:** Mock data is always shown as fallback — dashboard still renders fully
2. **Contract not deployed:** All UI still works — on-chain logging degrades gracefully to Supabase-only
3. **Anthropic API down:** Agent falls back to rule-based reasoning strings — decisions still written
4. **Wallet won't connect:** Show the demo wallet (0xDemo...0001) pre-loaded in Supabase seed

---

## KEY NUMBERS TO MEMORISE

| Metric | Value |
|---|---|
| Portfolio Value | $474,810 |
| Weighted APY | 5.52% |
| Daily Yield | $71.74 |
| Agent Decisions | 24 |
| Assets | 4 (USDY, mETH, USDe, fBTC) |
| Drift Threshold | 2.5% |
| Agent Poll Interval | 30 min |
| Reputation Score | 156 / 1000 |
| Contracts on Mantle | 2 (AgentIdentity + DecisionLedger) |
| Supabase Migrations | 4 |
| Realtime Tables | 4 |
