# YieldMind — Setup Guide

Complete local development setup from zero to running.

---

## Prerequisites

Install these before starting:

```bash
# Node.js 20+
node --version   # should be v20.x.x

# pnpm 9+
npm install -g pnpm
pnpm --version   # should be 9.x.x

# Supabase CLI
npm install -g supabase
supabase --version

# Optional: Hardhat (for contract deployment)
# Installed via pnpm inside packages/contracts
```

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/your-org/yieldmind
cd yieldmind
pnpm install
```

This installs all workspace packages in one shot.

---

## Step 2 — Environment Variables

```bash
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `BYBIT_API_KEY` | [testnet.bybit.com](https://testnet.bybit.com) → API Management |
| `BYBIT_API_SECRET` | Same as above |
| `HUGGINGFACE_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `DEPLOYER_PRIVATE_KEY` | Export from MetaMask (testnet wallet only!) |
| `AGENT_IDENTITY_CONTRACT_ADDRESS` | After Step 4 below |
| `DECISION_LEDGER_CONTRACT_ADDRESS` | After Step 4 below |

---

## Step 3 — Database Setup

### Option A: Supabase Cloud (recommended for team)

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the URL + keys into `.env.local`
3. Run migrations:

```bash
# Link to your cloud project
supabase link --project-ref your-project-ref

# Push all 5 migrations
supabase db push

# Seed dev data
supabase db reset --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" < supabase/seed.sql
```

### Option B: Local Supabase

```bash
supabase start         # Starts local Postgres + Studio
supabase db push       # Runs migrations 001–005
supabase db seed       # Seeds demo agent + positions

# Studio UI at: http://localhost:54323
# API at:        http://localhost:54321
```

---

## Step 4 — Deploy Smart Contracts (Mantle Testnet)

Get testnet MNT first: [faucet.testnet.mantle.xyz](https://faucet.testnet.mantle.xyz)

```bash
cd packages/contracts
pnpm install
pnpm deploy:testnet
```

Output will look like:
```
✓ AgentIdentity deployed at:  0x1234...abcd
✓ DecisionLedger deployed at: 0x5678...efgh

Add these to your .env.local:
AGENT_IDENTITY_CONTRACT_ADDRESS=0x1234...abcd
DECISION_LEDGER_CONTRACT_ADDRESS=0x5678...efgh
```

Copy those two addresses into `apps/web/.env.local`.

---

## Step 5 — Run Development

```bash
# Terminal 1: web app
pnpm dev

# Terminal 2: AI agent (optional — runs polling loop)
cd packages/agent
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 6 — Verify Everything Works

Visit these URLs to confirm each layer:

| URL | Should show |
|---|---|
| `localhost:3000` | Onboarding screen or dashboard |
| `localhost:3000/dashboard` | Portfolio with live data |
| `localhost:3000/api/health` | `{"status":"healthy",...}` |
| `localhost:3000/api/positions` | Portfolio stats JSON |
| `localhost:54323` | Supabase Studio (local only) |

Trigger a manual agent run from the `/agent` page → "Run Agent Now" button.
You should see new rows appear in the Agent Decision Log within seconds.

---

## Common Issues

**`pnpm install` fails with workspace errors**
→ Make sure `pnpm-workspace.yaml` exists at root. Run `pnpm install` from root, not from a package subfolder.

**Supabase `createServerClient` throws "Missing env vars"**
→ `.env.local` must be in `apps/web/`, not the root. Check the path.

**Agent run returns 404 "Agent not found"**
→ DB not seeded. Run `supabase db seed` or `supabase db reset`.

**Realtime not working (decisions don't stream)**
→ Run migration 004: `supabase db push`. Check Supabase dashboard → Realtime tab → confirm tables are enabled.

**Contract deploy fails "insufficient funds"**
→ Get testnet MNT from [faucet.testnet.mantle.xyz](https://faucet.testnet.mantle.xyz). Need ~0.1 MNT.

**Wallet shows "Switch to Mantle"**
→ Add Mantle Testnet to MetaMask: RPC `https://rpc.testnet.mantle.xyz`, Chain ID `5003`, Symbol `MNT`.

---

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From apps/web/
cd apps/web
vercel

# Set all env vars in Vercel dashboard under Settings → Environment Variables
# Then deploy production:
vercel --prod
```

The Vercel cron (`vercel.cron.json`) auto-runs the agent every 30 minutes.
