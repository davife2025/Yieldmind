-- ─────────────────────────────────────────────────────────────
-- YieldMind — Migration 004: Enable Supabase Realtime
-- Allows browser clients to stream live data
-- ─────────────────────────────────────────────────────────────

-- Enable realtime for agent decisions (live feed)
alter publication supabase_realtime add table agent_decisions;

-- Enable realtime for risk alerts (live bell counter)
alter publication supabase_realtime add table risk_alerts;

-- Enable realtime for positions (live portfolio values)
alter publication supabase_realtime add table positions;

-- Enable realtime for yield snapshots (live APY chart)
alter publication supabase_realtime add table yield_snapshots;
