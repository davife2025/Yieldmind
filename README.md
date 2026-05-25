# YieldMind

> **Real assets. Autonomous yield. On-chain proof.**

AI-Powered RWA Yield Intelligence Agent on Mantle — built for The Turing Test Hackathon (AI x RWA track).

---

## What It Does

YieldMind is an autonomous AI agent that:
- Monitors USDY, mETH, USDe, fBTC positions on Mantle in real time
- Detects yield opportunities and risk signals using Claude AI
- Executes and logs rebalancing decisions — every action recorded on-chain
- Issues each agent an ERC-8004 identity NFT (unique on-chain reputation)
- Surfaces everything in a live dashboard for full transparency

---

## Tech Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 App Router + Tailwind CSS |
| Database | Supabase Postgres + Realtime |
| AI Agent | Anthropic Claude API |
| Price Feeds | Bybit REST API |
| Contracts | Solidity + Hardhat on Mantle |
| Wallet | wagmi v2 + viem |
| Charts | Recharts |
| Deploy | Vercel + Supabase Cloud |

---

## Monorepo Structure

```
yieldmind/
├── apps/
│   └── web/                  # Next.js App Router
├── packages/
│   ├── db/                   # Supabase client + types
│   ├── contracts/            # ERC-8004 Solidity contracts
│   ├── agent/                # AI agent logic
│   └── shared/               # Shared types + utils
├── supabase/
│   ├── migrations/           # SQL migrations
│   └── seed.sql
└── turbo.json
```

---

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Supabase CLI
- A Mantle testnet wallet with MNT
- Bybit API key
- Anthropic API key

### 1. Clone & Install

```bash
git clone https://github.com/your-org/yieldmind
cd yieldmind
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example apps/web/.env.local
# Fill in all values in apps/web/.env.local
```

### 3. Database Setup

```bash
# Start local Supabase
supabase start

# Run migrations
supabase db push

# Seed dev data
supabase db seed
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Build Sessions

| Session | Focus | Status |
|---|---|---|
| 1 | Foundation — monorepo, Supabase schema, Next.js scaffold | ✅ Complete |
| 2 | AI Agent core — yield scanner, risk engine, Claude integration | 🔜 Next |
| 3 | Smart contracts — ERC-8004 Agent Identity NFT on Mantle | ⏳ Pending |
| 4 | Dashboard UI Part 1 — portfolio, positions, charts | ⏳ Pending |
| 5 | Dashboard UI Part 2 — agent feed, realtime, wallet auth | ⏳ Pending |
| 6 | Polish, deploy, demo prep | ⏳ Pending |

---

## Hackathon

Built for **The Turing Test Hackathon** — AI x RWA track  
Powered by Mantle Network · Bybit · Anthropic

[Register on DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail)
