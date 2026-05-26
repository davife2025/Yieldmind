-- ─────────────────────────────────────────────────────────────
-- YieldMind — Migration 005: Fix RLS for Realtime & Writes
-- ─────────────────────────────────────────────────────────────

-- Allow service role to INSERT/UPDATE on all tables
-- (Service role bypasses RLS by default in Supabase, but
--  explicit policies prevent confusion)

-- agent_decisions: allow insert from service role (agent writes)
create policy "decisions_insert_service"
  on agent_decisions for insert
  using (true)
  with check (true);

-- risk_alerts: allow insert + update (resolve) from service role
create policy "alerts_insert_service"
  on risk_alerts for insert
  using (true)
  with check (true);

create policy "alerts_update_service"
  on risk_alerts for update
  using (true)
  with check (true);

-- positions: allow update (rebalance adjustments)
create policy "positions_update_service"
  on positions for update
  using (true)
  with check (true);

-- yield_snapshots: allow insert (agent writes snapshots)
create policy "yield_snapshots_insert"
  on yield_snapshots for insert
  using (true)
  with check (true);

-- agents: allow insert (new wallet registration) + update (stats)
create policy "agents_insert"
  on agents for insert
  using (true)
  with check (true);

create policy "agents_update"
  on agents for update
  using (true)
  with check (true);
