-- ─────────────────────────────────────────────────────────────
-- YieldMind — Seed Data (Development Only)
-- ─────────────────────────────────────────────────────────────

-- Demo agent
insert into agents (id, wallet_address, name, total_value_usd, weighted_apy, decisions_count)
values (
  '00000000-0000-0000-0000-000000000001',
  '0xDemoWallet0000000000000000000000000001',
  'YieldMind Agent #1',
  474810.00,
  5.52,
  24
);

-- Demo positions
insert into positions (agent_id, asset_id, balance, value_usd, allocation_pct, target_allocation_pct) values
  ('00000000-0000-0000-0000-000000000001', 'USDY',  124500.00, 124500.00, 26.22, 25.00),
  ('00000000-0000-0000-0000-000000000001', 'mETH',  42.18,     148630.00, 31.30, 32.00),
  ('00000000-0000-0000-0000-000000000001', 'USDe',  89200.00,  89200.00,  18.79, 18.00),
  ('00000000-0000-0000-0000-000000000001', 'fBTC',  1.84,      112480.00, 23.69, 25.00);

-- Yield snapshots (last 6 hours, 30-min intervals)
insert into yield_snapshots (asset_id, apy, price_usd, source, timestamp) values
  ('USDY', 5.23, 1.0012, 'ondo',   now() - interval '0 minutes'),
  ('mETH', 4.81, 3524.10, 'mantle', now() - interval '0 minutes'),
  ('USDe', 8.94, 1.0003, 'ethena', now() - interval '0 minutes'),
  ('fBTC', 3.12, 61130.00, 'mantle', now() - interval '0 minutes'),
  ('USDY', 5.21, 1.0011, 'ondo',   now() - interval '30 minutes'),
  ('mETH', 4.79, 3498.00, 'mantle', now() - interval '30 minutes'),
  ('USDe', 9.01, 1.0002, 'ethena', now() - interval '30 minutes'),
  ('fBTC', 3.10, 60980.00, 'mantle', now() - interval '30 minutes'),
  ('USDY', 5.20, 1.0010, 'ondo',   now() - interval '60 minutes'),
  ('mETH', 4.75, 3450.00, 'mantle', now() - interval '60 minutes'),
  ('USDe', 9.12, 0.9999, 'ethena', now() - interval '60 minutes'),
  ('fBTC', 3.08, 60750.00, 'mantle', now() - interval '60 minutes');

-- Agent decisions
insert into agent_decisions (agent_id, type, reasoning, action_taken, tx_hash, status, asset_id, value_delta_usd, apy_delta) values
  (
    '00000000-0000-0000-0000-000000000001',
    'REBALANCE',
    'Portfolio drift detected: USDY overweight by 1.22% vs target. Shifting 12% of USDY allocation to mETH to capture higher LST yield while maintaining stability floor.',
    'Shifted $14,940 USDY → mETH',
    '0x4f2a8c1e3b7d9f0a2c4e6b8d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b7d9f0a',
    'confirmed',
    'USDY',
    620.00,
    0.42
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'RISK',
    'USDe funding rate spike detected: 8-hour rate moved from 0.012% to 0.031%. Elevated funding suggests leveraged long pressure. Reducing USDe exposure by 8% as precautionary measure.',
    'Reduced USDe position by $7,136',
    '0x3e1d7a4b9c2f5e8a1d4g7b0c3f6a9d2e5b8c1f4a7d0b3e6c9f2a5d8b1e4g7a0',
    'confirmed',
    'USDe',
    -280.00,
    -0.18
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'YIELD',
    'New mETH staking epoch commenced. APY increased from 4.69% to 4.81% following validator rewards distribution. No action required — current allocation already at target.',
    'APY update logged. No rebalance needed.',
    null,
    'confirmed',
    'mETH',
    null,
    0.12
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'REBALANCE',
    'Minor portfolio drift correction after USDe reduction. fBTC underweight by 1.31% vs target. Allocating recovered capital to fBTC to maintain diversification targets.',
    'Shifted $6,200 into fBTC',
    '0x9c8b2d5e1a4f7c0b3e6a9d2c5f8b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2',
    'confirmed',
    'fBTC',
    190.00,
    0.09
  );

-- Risk alerts
insert into risk_alerts (agent_id, asset_id, severity, title, message, resolved) values
  (
    '00000000-0000-0000-0000-000000000001',
    'USDe',
    'MED',
    'Funding Rate Elevated',
    'USDe 8h funding rate at 0.031%, above 0.025% threshold. Monitor for continued pressure. Position reduced by 8%.',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    null,
    'LOW',
    'Mantle Gas Price Spike',
    'Network gas spiked to 0.08 gwei. Batching next 2 rebalance transactions to optimise execution cost.',
    true
  );
