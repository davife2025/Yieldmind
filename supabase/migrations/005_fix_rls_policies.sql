-- ─────────────────────────────────────────────────────────────
-- YieldMind — Migration 005: Fix RLS for Writes & Realtime
-- Uses DROP IF EXISTS + CREATE to be safely re-runnable
-- ─────────────────────────────────────────────────────────────

-- agent_decisions: allow insert from service role (agent writes)
drop policy if exists "decisions_insert_service" on agent_decisions;
create policy "decisions_insert_service"
  on agent_decisions for insert
  using (true)
  with check (true);

-- risk_alerts: allow insert + update (resolve)
drop policy if exists "alerts_insert_service" on risk_alerts;
create policy "alerts_insert_service"
  on risk_alerts for insert
  using (true)
  with check (true);

drop policy if exists "alerts_update_service" on risk_alerts;
create policy "alerts_update_service"
  on risk_alerts for update
  using (true)
  with check (true);

-- positions: allow update (rebalance adjustments)
drop policy if exists "positions_update_service" on positions;
create policy "positions_update_service"
  on positions for update
  using (true)
  with check (true);

-- yield_snapshots: allow insert (agent writes snapshots)
drop policy if exists "yield_snapshots_insert" on yield_snapshots;
create policy "yield_snapshots_insert"
  on yield_snapshots for insert
  using (true)
  with check (true);

-- agents: allow insert (new wallet) + update (stats)
drop policy if exists "agents_insert" on agents;
create policy "agents_insert"
  on agents for insert
  using (true)
  with check (true);

drop policy if exists "agents_update" on agents;
create policy "agents_update"
  on agents for update
  using (true)
  with check (true);
