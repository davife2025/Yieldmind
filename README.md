# YieldMind

> **Real assets. Autonomous yield. On-chain proof.**

AI-Powered RWA Yield Intelligence Agent on Mantle — built for The Turing Test Hackathon (AI x RWA track).

[![Mantle](https://img.shields.io/badge/Mantle-Testnet-00E5CC?style=flat)](https://mantle.xyz)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat)](https://supabase.com)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_4-D4A017?style=flat)](https://anthropic.com)

---

## What It Does

YieldMind is an autonomous AI agent that:

- **Monitors** USDY, mETH, USDe, fBTC positions on Mantle in real time via Bybit price feeds
- **Detects** yield opportunities and risk signals using Claude AI reasoning
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
The AI Reasoning panel in every decision card shows exactly why the agent acted. Judges can expand any decision, read the full Claude reasoning, and verify the Mantle transaction — all in one view.

---

## Architecture

```
yieldmind/
├── apps/
│   └── web/                     # Next.js 14 App Router
│       ├── app/
│       │   ├── dashboard/        # Portfolio overview
│       │   ├── positions/        # Asset positions + charts
│       │   ├── agent/            # AI agent feed + controls
│       │   ├── alerts/           # Risk alerts
│       │   └── api/              # API routes
│       └── components/
│           ├── dashboard/        # Portfolio, positions, alerts
│           ├── agent/            # Agent feed, identity, controls
│           ├── charts/           # Area, bar, donut, line charts
│           ├── layout/           # Sidebar, TopBar, MobileNav
│           ├── ui/               # Card, Badge, Skeleton, etc.
│           └── wallet/           # WalletButton
├── packages/
│   ├── db/                       # Supabase client + TypeScript types
│   ├── agent/                    # AI agent logic
│   │   ├── bybit/client.ts       # Price feeds
│   │   ├── scanner/              # Yield scanner + portfolio state
│   │   ├── risk/riskEngine.ts    # Risk detection
│   │   ├── claude/               # AI reasoning via Claude API
│   │   ├── decisions/            # Decision writer to Supabase
│   │   └── mantle/               # On-chain writer (ERC-8004 + Ledger)
│   ├── contracts/                # Solidity contracts
│   │   ├── AgentIdentity.sol     # ERC-8004 soul-bound NFT
│   │   └── DecisionLedger.sol    # Immutable on-chain decision log
│   └── shared/                   # Types, constants, utilities
└── supabase/
    ├── migrations/               # 4 SQL migrations
    └── seed.sql                  # Dev seed data
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 App Router + Tailwind CSS |
| Database | Supabase Postgres + Realtime WebSocket |
| AI Agent | Anthropic Claude API (claude-sonnet-4) |
| Price Feeds | Bybit REST API |
| Contracts | Solidity 0.8.24 + Hardhat on Mantle |
| Wallet | wagmi v2 + viem |
| Charts | Recharts (Area, Bar, Pie, Line) |
| Deploy | Vercel (web) + Supabase Cloud + Mantle Testnet |

---

## Getting Started

### Prerequisites
- Node.js >= 20, pnpm >= 9
- Supabase CLI (`npm i -g supabase`)
- Mantle testnet wallet with MNT ([faucet](https://faucet.testnet.mantle.xyz))
- Bybit API key ([testnet](https://testnet.bybit.com))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone & Install
```bash
git clone https://github.com/your-org/yieldmind
cd yieldmind
pnpm install
```

### 2. Environment
```bash
cp .env.example apps/web/.env.local
# Fill in all values
```

### 3. Database
```bash
supabase start
supabase db push        # Runs all 4 migrations
supabase db seed        # Seeds demo agent + positions
```

### 4. Deploy Contracts (Mantle Testnet)
```bash
cd packages/contracts
pnpm install
pnpm deploy:testnet
# Copy printed contract addresses to .env.local
```

### 5. Run
```bash
pnpm dev                # Starts web app on localhost:3000
# In a second terminal:
cd packages/agent && pnpm dev   # Starts AI agent polling loop
```

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# From apps/web/
vercel

# Set environment variables in Vercel dashboard
# Deploy: vercel --prod
```

The Vercel cron job (`vercel.cron.json`) runs the agent automatically every 30 minutes in production.

---

## Session Build Log

| Session | Focus | Files |
|---|---|---|
| 1 | Monorepo foundation, Supabase schema, Next.js scaffold | 40 |
| 2 | AI Agent — yield scanner, risk engine, Claude reasoning | 57 |
| 3 | Smart contracts — ERC-8004 NFT + DecisionLedger on Mantle | 78 |
| 4 | Dashboard UI — charts, positions, allocation, APY | 107 |
| 5 | Realtime, wallet auth, rebalance modal, mobile nav | 137 |
| 6 | Polish, deploy, onboarding, error states, demo script | 155 |

---

## Hackathon

Built for **The Turing Test Hackathon** — AI x RWA track
Powered by Mantle Network · Bybit · Anthropic

[Register on DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail) ·
[Mantle Network](https://mantle.xyz) ·
[Follow @Mantle_Official](https://x.com/Mantle_Official)
