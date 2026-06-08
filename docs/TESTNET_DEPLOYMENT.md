# YieldMind — Mantle Testnet Deployment Guide

Complete step-by-step guide to deploying YieldMind smart contracts to
Mantle Testnet and wiring everything up. Follow this exactly and you'll
have both contracts live and the full app running end-to-end.

---

## What You're Deploying

Two contracts go on-chain:

| Contract | Purpose |
|---|---|
| `AgentIdentity.sol` | ERC-8004 soul-bound NFT — one per agent wallet |
| `DecisionLedger.sol` | Immutable log of every AI decision on Mantle |

Chain: **Mantle Testnet** · Chain ID: `5003` · Native token: `MNT`

---

## Prerequisites

### 1. Install tools

```bash
node --version   # must be v20+
pnpm --version   # must be v9+  (npm install -g pnpm)
```

### 2. A MetaMask wallet (testnet only — never use mainnet funds)

If you don't have one:
1. Install [MetaMask](https://metamask.io)
2. Create a new wallet — write down the seed phrase
3. This wallet is your **deployer** — it pays gas for contract deployment

### 3. Add Mantle Testnet to MetaMask

MetaMask doesn't have Mantle Testnet by default. Add it manually:

1. Open MetaMask → click the network selector (top left)
2. Click **Add network** → **Add a network manually**
3. Fill in:

| Field | Value |
|---|---|
| Network name | Mantle Testnet |
| New RPC URL | `https://rpc.testnet.mantle.xyz` |
| Chain ID | `5003` |
| Currency symbol | `MNT` |
| Block explorer URL | `https://explorer.testnet.mantle.xyz` |

4. Click **Save** → switch to Mantle Testnet

Alternatively, visit [chainlist.org](https://chainlist.org/?search=mantle&testnets=true)
and click **Add to MetaMask** next to Mantle Testnet.

---

## Step 1 — Get Testnet MNT

You need MNT to pay gas. Two faucets:

**Option A — Official Mantle Faucet:**
1. Go to [faucet.testnet.mantle.xyz](https://faucet.testnet.mantle.xyz)
2. Connect your MetaMask wallet
3. Click **Request MNT** — you'll receive ~1 MNT
4. Deployment costs ~0.02–0.05 MNT total (both contracts + authorisation txs)

**Option B — Alchemy Faucet (if official is slow):**
1. Go to [faucets.alchemy.com](https://www.alchemy.com/faucets/mantle-sepolia)
2. Paste your wallet address
3. Request tokens

**Verify you received MNT:**
- Open MetaMask → should show MNT balance > 0
- Or check: `https://explorer.testnet.mantle.xyz/address/YOUR_ADDRESS`

---

## Step 2 — Export Your Private Key

The deploy script needs your private key to sign transactions.

> ⚠️ **Use a dedicated testnet wallet only. Never use a wallet that holds real funds.**

**From MetaMask:**
1. Click the three dots (⋮) next to your account name
2. Select **Account details**
3. Click **Show private key**
4. Enter your MetaMask password
5. Copy the private key (starts with `0x...`)

---

## Step 3 — Configure Environment

Make sure `apps/web/.env.local` has the deployer key:

```bash
# In apps/web/.env.local — add or confirm these lines:
NEXT_PUBLIC_MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
NEXT_PUBLIC_CHAIN_ID=5003
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Leave these blank for now — filled in after Step 5:
AGENT_IDENTITY_CONTRACT_ADDRESS=
DECISION_LEDGER_CONTRACT_ADDRESS=
```

The Hardhat config reads from `apps/web/.env.local` via dotenv:
```typescript
// packages/contracts/hardhat.config.ts
dotenv.config({ path: "../../.env.local" })  // ← reads from apps/web/
```

---

## Step 4 — Install Contract Dependencies

```bash
cd packages/contracts
pnpm install
```

This installs:
- `hardhat` — Ethereum development framework
- `@openzeppelin/contracts` v5 — base ERC-721 implementation
- `@nomicfoundation/hardhat-toolbox` — compile, test, deploy utilities

---

## Step 5 — Compile the Contracts

Always compile before deploying to catch any errors:

```bash
# Still in packages/contracts/
pnpm compile
```

Expected output:
```
Compiling 2 files with Solc 0.8.24
Compilation finished successfully
```

If you see errors, check you're in `packages/contracts/` and ran `pnpm install`.

---

## Step 6 — Run Tests (Recommended)

Confirm both contracts pass all 15 tests before deploying:

```bash
pnpm test
```

Expected output:
```
  YieldMind Contracts
    AgentIdentity — Minting
      ✓ mints an identity NFT to an agent wallet
      ✓ assigns correct initial profile
      ✓ prevents duplicate minting for same wallet
      ✓ rejects mint from non-recorder
      ✓ emits AgentMinted event
      ✓ increments token ID for successive mints
    AgentIdentity — Soul-Binding
      ✓ blocks transfer between wallets
      ✓ blocks safeTransferFrom as well
    AgentIdentity — Decision Recording
      ✓ records a decision and updates profile
      ...
  15 passing
```

---

## Step 7 — Deploy to Mantle Testnet

```bash
# Still in packages/contracts/
pnpm deploy:testnet
```

The script runs 4 steps and takes ~30–60 seconds:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YieldMind — Contract Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network:  mantleTestnet
Deployer: 0xYourWallet...
Balance:  0.98 MNT

[1/4] Deploying AgentIdentity (ERC-8004)...
      ✓ AgentIdentity deployed at: 0x1234567890abcdef...

[2/4] Deploying DecisionLedger...
      ✓ DecisionLedger deployed at: 0xabcdef1234567890...

[3/4] Authorising deployer as recorder...
      ✓ Deployer authorised as recorder on both contracts

[4/4] Saving deployment addresses...
      ✓ Saved to deployments/mantleTestnet.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Add these to your .env.local:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENT_IDENTITY_CONTRACT_ADDRESS=0x1234567890abcdef...
DECISION_LEDGER_CONTRACT_ADDRESS=0xabcdef1234567890...

✓ Deployment complete!
```

---

## Step 8 — Update .env.local

Copy the two printed addresses into `apps/web/.env.local`:

```bash
AGENT_IDENTITY_CONTRACT_ADDRESS=0x1234567890abcdef...
DECISION_LEDGER_CONTRACT_ADDRESS=0xabcdef1234567890...
```

The deployment info is also saved to:
```
packages/contracts/deployments/mantleTestnet.json
```

Keep this file — it's your record of what's deployed and when.

---

## Step 9 — Verify Deployment on Explorer

Open Mantle Testnet Explorer and confirm both contracts are live:

```
https://explorer.testnet.mantle.xyz/address/0xYOUR_AGENT_IDENTITY_ADDRESS
https://explorer.testnet.mantle.xyz/address/0xYOUR_DECISION_LEDGER_ADDRESS
```

You should see:
- ✓ Contract tab with bytecode
- ✓ Internal Transactions showing the `setRecorder` calls
- ✓ Contract creator = your deployer wallet

---

## Step 10 — Verify Contracts (Optional but Recommended)

Publishing the source code to the explorer lets judges read it directly:

```bash
# Verify AgentIdentity
pnpm hardhat verify --network mantleTestnet 0xYOUR_AGENT_IDENTITY_ADDRESS

# Verify DecisionLedger
pnpm hardhat verify --network mantleTestnet 0xYOUR_DECISION_LEDGER_ADDRESS
```

After verification the explorer will show the **Contract** tab with full
source code and ABI — judges can read `AgentIdentity.sol` directly on
the explorer without needing the repo.

---

## Step 11 — Test the Integration End-to-End

Restart your Next.js dev server so it picks up the new env vars:

```bash
cd apps/web   # (or from root)
pnpm dev
```

Then verify the full chain:

**1. Check health endpoint:**
```
http://localhost:3000/api/health
```
Should return:
```json
{
  "status": "healthy",
  "checks": {
    "supabase": "ok",
    "huggingface": "ok",
    "bybit": "ok",
    "agentNFT": "ok",
    "decisionLedger": "ok"
  },
  "network": "Mantle Testnet",
  "chainId": 5003
}
```
Both `agentNFT` and `decisionLedger` must show `"ok"`.

**2. Mint an Agent Identity NFT:**
- Open the dashboard → `/agent`
- Connect your MetaMask wallet (must be on Mantle Testnet)
- Click **Mint Agent Identity**
- MetaMask will **not** prompt — the mint is signed server-side by
  `DEPLOYER_PRIVATE_KEY`, not your wallet
- After ~10 seconds: Token ID appears on the card
- Click the explorer link → verify the transaction on Mantle

**3. Run the agent and verify on-chain logging:**
- Click **Run Agent Now** in AgentControls
- Wait ~5–10 seconds
- A new decision appears in the feed
- Expand it → click **Verify on Mantle**
- The transaction should be confirmed on the explorer

---

## Troubleshooting

**`Error: Deployer has no MNT`**
→ Your wallet balance is 0. Get MNT from the faucet first (Step 1).
→ Check MetaMask is on Mantle Testnet, not Ethereum mainnet.

**`Error: insufficient funds for gas`**
→ You have MNT but not enough for gas. Request more from the faucet.
→ Each deploy tx costs ~0.005–0.01 MNT. You need ~0.05 MNT total.

**`ProviderError: could not detect network`**
→ RPC is unreachable. Check internet connection.
→ Try alternative RPC: `https://rpc.testnet.mantle.xyz` is the standard one.

**`Error: Contract addresses not set`**
→ You forgot to add the addresses to `.env.local` after deployment.
→ Check `packages/contracts/deployments/mantleTestnet.json` for the addresses.

**`Error: DEPLOYER_PRIVATE_KEY not set`**
→ The key isn't in `apps/web/.env.local`.
→ Remember — `.env.local` goes in `apps/web/`, not the project root.

**Mint button says error after clicking**
→ Check that `AGENT_IDENTITY_CONTRACT_ADDRESS` is set in `.env.local`.
→ Restart the dev server after changing `.env.local`.
→ Check the server logs for the specific error.

**Health endpoint shows `agentNFT: "error"`**
→ `AGENT_IDENTITY_CONTRACT_ADDRESS` is missing or empty in `.env.local`.
→ Restart the dev server.

**Transaction pending for more than 2 minutes**
→ Mantle Testnet occasionally has congestion. Wait it out.
→ Or bump gas: in `hardhat.config.ts` change `gasPrice: "auto"` to
  `gasPrice: 2000000000` (2 gwei) and redeploy.

---

## Deployment Addresses (fill in after deploy)

| Contract | Address | Explorer |
|---|---|---|
| AgentIdentity | `0x...` | [view](https://explorer.testnet.mantle.xyz/address/0x...) |
| DecisionLedger | `0x...` | [view](https://explorer.testnet.mantle.xyz/address/0x...) |
| Deployer wallet | `0x...` | [view](https://explorer.testnet.mantle.xyz/address/0x...) |
| Deployed at | — | — |

Update this table after your deployment for the judges.

---

## What Happens at Each Step in the App

Once deployed, here's the flow for a judge watching live:

```
Judge clicks "Mint Agent Identity"
  → POST /api/agent/mint
  → MantleWriter.mintAgentIdentity()
  → AgentIdentity.mintAgentIdentity() tx on Mantle
  → Token ID returned, stored in Supabase
  → Explorer link shown to judge

Judge clicks "Run Agent Now"  
  → POST /api/agent/run
  → Yield scanner + risk engine run
  → writeDecision() saves to Supabase
  → MantleWriter.logDecision() tx on Mantle
  → tx_hash stored in agent_decisions table
  → Decision appears in feed with "Verify on Mantle" link
  → Judge clicks link → sees confirmed tx on explorer
```

This is the complete on-chain audit trail that makes YieldMind's
"radical transparency" claim verifiable.

---

## Deploying apps/api (Standalone API Server)

`apps/api` is a separate Express server with a built-in 30-minute agent cron.
Use this instead of (or alongside) the Next.js API routes for production.

### Run locally

```bash
# From project root
pnpm dev --filter=@yieldmind/api

# Or directly
cd apps/api
pnpm dev
```

Server starts on `http://localhost:4000`

### Environment variables for apps/api

Add to `apps/api/.env` (copy from root `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Bybit + HuggingFace + Mantle (same as apps/web)
BYBIT_API_KEY=...
BYBIT_API_SECRET=...
HUGGINGFACE_TOKEN=hf_...
AGENT_IDENTITY_CONTRACT_ADDRESS=0x...
DECISION_LEDGER_CONTRACT_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...

# API server specific
PORT=4000
YIELDMIND_API_KEY=your-secret-key   # leave blank for dev (auth disabled)
CORS_ORIGIN=http://localhost:3000
```

### API endpoints

| Method | Path | Description |
|---|---|---|
| GET  | `/health` | Stack health check |
| GET  | `/api/v1/agent/status` | Last run, next run, decision counts |
| POST | `/api/v1/agent/run` | Trigger agent run now |
| GET  | `/api/v1/agent/decisions` | Recent decisions feed |
| GET  | `/api/v1/agent/profile` | Agent profile + on-chain data |
| POST | `/api/v1/agent/mint` | Mint ERC-8004 NFT |
| POST | `/api/v1/agent/rebalance` | Execute rebalance |
| GET  | `/api/v1/positions` | Portfolio positions |
| GET  | `/api/v1/positions/stats` | Portfolio stats |
| PATCH | `/api/v1/positions` | Update position balances |
| GET  | `/api/v1/yields` | APY history |
| GET  | `/api/v1/yields/latest` | Latest APY per asset |
| GET  | `/api/v1/alerts` | Risk alerts |
| PATCH | `/api/v1/alerts/:id` | Resolve alert |
| GET  | `/api/v1/prices` | Live ETH/BTC prices |
| GET  | `/api/v1/cron/status` | Cron job status |

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# Deploy
railway up --service yieldmind-api
```

Set env vars in the Railway dashboard under Variables.
The `railway.toml` in `apps/api/` configures the build automatically.

### Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

cd apps/api
fly launch    # creates fly.toml
fly secrets set SUPABASE_SERVICE_ROLE_KEY=... HUGGINGFACE_TOKEN=hf_... # etc
fly deploy
```
