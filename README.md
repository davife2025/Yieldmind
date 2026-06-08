# YieldMind

> **Real assets. Autonomous yield. On-chain proof.**

AI-Powered RWA Yield Intelligence Agent on Mantle — built for The Turing Test Hackathon (AI x RWA track).

[![Mantle](https://img.shields.io/badge/Mantle-Testnet-00E5CC?style=flat)](https://mantle.xyz)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat)](https://supabase.com)
[![Kimi K2](https://img.shields.io/badge/Kimi_K2-HuggingFace-FFD21E?style=flat)](https://huggingface.co/moonshotai/Kimi-K2-Instruct)

---

## What It Does

YieldMind is an autonomous AI agent that:

- **Monitors** USDY, mETH, USDe, fBTC positions on Mantle in real time via Bybit price feeds
- **Detects** yield opportunities and risk signals using Kimi K2 AI reasoning via HuggingFace
- **Rebalances** portfolios when drift exceeds thresholds — every action on-chain via Mantle
- **Issues** each agent an ERC-8004 soul-bound identity NFT — permanent on-chain reputation
- **Streams** every decision live to the dashboard — full reasoning, tx hash, verifiable proof

---

## Three Hackathon Differentiators

### 1. On-Chain AI Benchmarking
Every agent decision is logged to `DecisionLedger.sol` on Mantle — including the reasoning hash, APY delta, and value impact. This creates the first verifiable, decentralised record of AI performance in Web3.

### 2. ERC-8004 Agent Identity
Every agent gets a soul-bound NFT via `AgentIdentity.sol`. It tracks decisions, rebalances, yield earned, and reputation score (0–1000). Non-transferable — the agent's on-chain passport.

### 3. Radical Transparency
The AI Reasoning panel in every decision card shows exactly why the agent acted. Judges can expand any decision, read the full Kimi K2 reasoning, and verify the Mantle transaction — all in one view.

---

## Architecture

```
yieldmind/
├── apps/
│   ├── web/                     # Next.js 14 App Router (frontend + API routes)
│   └── api/                     # Standalone Express API server + agent cron
├── packages/
│   ├── db/                      # Supabase client + TypeScript types
│   ├── agent/                   # AI agent logic
│   │   ├── bybit/               # Price feeds
│   │   ├── scanner/             # Yield scanner + portfolio state
│   │   ├── risk/                # Risk detection engine
│   │   ├── claude/              # AI reasoning via Kimi K2 (HuggingFace)
│   │   ├── decisions/           # Decision writer to Supabase
│   │   └── mantle/              # On-chain writer (ERC-8004 + Ledger)
│   ├── contracts/               # Solidity contracts
│   │   ├── AgentIdentity.sol    # ERC-8004 soul-bound NFT
│   │   └── DecisionLedger.sol   # Immutable on-chain decision log
│   └── shared/                  # Types, constants, utilities
└── supabase/
    ├── migrations/              # 5 SQL migrations
    └── seed.sql                 # Dev seed data
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 App Router + Tailwind CSS |
| API Server | Express + node-cron (apps/api) |
| Database | Supabase Postgres + Realtime WebSocket |
| AI Reasoning | Kimi K2 via HuggingFace Inference API |
| Price Feeds | Bybit REST API |
| Contracts | Solidity 0.8.24 + Hardhat on Mantle |
| Wallet | wagmi v2 + viem |
| Charts | Recharts (Area, Bar, Pie, Line) |
| Deploy | Vercel (web) + Railway (api) + Supabase Cloud + Mantle Testnet |

---

## Getting Started

### Prerequisites
- Node.js >= 20, pnpm >= 9
- Supabase CLI (`npm i -g supabase`)
- Mantle testnet wallet with MNT ([faucet](https://faucet.testnet.mantle.xyz))
- Bybit API key ([testnet](https://testnet.bybit.com))
- HuggingFace token ([settings/tokens](https://huggingface.co/settings/tokens)) — for Kimi K2

### 1. Clone & Install
```bash
git clone https://github.com/your-org/yieldmind
cd yieldmind
pnpm install
```

### 2. Environment
```bash
cp .env.example apps/web/.env.local
# Fill in all values — see docs/SETUP.md
```

### 3. Database
```bash
supabase start
supabase db push        # Runs all 5 migrations
supabase db seed        # Seeds demo agent + positions
```

### 4. Deploy Contracts (Mantle Testnet)
```bash
cd packages/contracts
pnpm install
pnpm deploy:testnet
# Copy printed contract addresses to .env.local
# See docs/TESTNET_DEPLOYMENT.md for full guide
```

### 5. Run
```bash
# Terminal 1: Next.js web app
pnpm dev --filter=@yieldmind/web

# Terminal 2: Standalone API + agent cron
pnpm dev --filter=@yieldmind/api
```

Open [http://localhost:3000](http://localhost:3000)

---

## AI Model

YieldMind uses **Kimi K2** (`moonshotai/Kimi-K2-Instruct`) via the HuggingFace Inference API for all portfolio reasoning decisions.

Every decision — rebalances, risk mitigations, yield opportunity assessments — is reasoned by Kimi K2 with full portfolio context, then stored in Supabase and (optionally) hashed on-chain via Mantle for verifiability.

**Required env var:** `HUGGINGFACE_TOKEN=hf_...`
Get yours at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

---

## Deployment

### Web App (Vercel)
```bash
cd apps/web && vercel --prod
```

### API Server (Railway)
```bash
cd apps/api && railway up
```

See [docs/TESTNET_DEPLOYMENT.md](docs/TESTNET_DEPLOYMENT.md) for complete deployment guide.

---

## Session Build Log

| Session | What was built |
|---|---|
| **1** | Turborepo monorepo, Supabase schema (5 tables), Next.js scaffold |
| **2** | AI agent: Bybit feeds, yield scanner, risk engine, Kimi K2 reasoning |
| **3** | ERC-8004 AgentIdentity.sol, DecisionLedger.sol, deploy script, 15 tests |
| **4** | Dashboard UI: charts, positions, allocation, APY breakdown |
| **5** | Supabase Realtime, wagmi wallet, rebalance modal, mobile nav |
| **6** | Onboarding, error states, Vercel deploy, CI pipeline, demo script |
| **Review** | Full API layer (13 routes), apps/api standalone server, type safety |

---

## Hackathon

Built for **The Turing Test Hackathon** — AI x RWA track
Powered by Mantle Network · Bybit · HuggingFace (Kimi K2)

[Register on DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail) ·
[Mantle Network](https://mantle.xyz) ·
[Follow @Mantle_Official](https://x.com/Mantle_Official)
