-- ─────────────────────────────────────────────────────────────
-- YieldMind — Migration 002: Helper Functions
-- ─────────────────────────────────────────────────────────────

-- Increment agent decision count atomically
create or replace function increment_decisions_count(agent_id uuid)
returns void as $$
begin
  update agents
  set decisions_count = decisions_count + 1
  where id = agent_id;
end;
$$ language plpgsql security definer;

-- Get latest yield per asset (used by portfolio stats)
create or replace function get_latest_yields()
returns table(asset_id text, apy numeric, price_usd numeric, timestamp timestamptz) as $$
  select distinct on (ys.asset_id)
    ys.asset_id::text,
    ys.apy,
    ys.price_usd,
    ys.timestamp
  from yield_snapshots ys
  order by ys.asset_id, ys.timestamp desc;
$$ language sql stable;

-- Get agent portfolio summary
create or replace function get_portfolio_summary(p_wallet_address text)
returns table(
  total_value_usd numeric,
  weighted_apy numeric,
  decisions_count integer,
  active_alerts bigint
) as $$
  select
    a.total_value_usd,
    a.weighted_apy,
    a.decisions_count,
    count(ra.id) filter (where ra.resolved = false) as active_alerts
  from agents a
  left join risk_alerts ra on ra.agent_id = a.id
  where a.wallet_address = p_wallet_address
  group by a.total_value_usd, a.weighted_apy, a.decisions_count;
$$ language sql stable;
