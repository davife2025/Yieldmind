-- ─────────────────────────────────────────────────────────────
-- YieldMind — Migration 003: On-Chain Contract Tracking
-- ─────────────────────────────────────────────────────────────

-- Track on-chain decision counts separately from DB counts
alter table agents
  add column if not exists on_chain_decisions_count integer not null default 0,
  add column if not exists reputation_score         integer not null default 100,
  add column if not exists achievements_count       integer not null default 0;

-- Store deployed contract addresses (one row per deployment)
create table if not exists contract_deployments (
  id           uuid primary key default gen_random_uuid(),
  network      text not null,
  chain_id     integer not null,
  contract_name text not null,
  address      text not null,
  tx_hash      text,
  deployed_at  timestamptz not null default now()
);

-- Index for fast lookup
create index if not exists idx_contract_deployments_network
  on contract_deployments(network, contract_name);

-- Insert known testnet deployments (update after running deploy script)
-- insert into contract_deployments (network, chain_id, contract_name, address)
-- values
--   ('mantleTestnet', 5003, 'AgentIdentity',  '0x...'),
--   ('mantleTestnet', 5003, 'DecisionLedger', '0x...');
