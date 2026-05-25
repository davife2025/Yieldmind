"use client"

import { useEffect, useState } from "react"
import { getBrowserClient } from "@yieldmind/db"
import type { RiskAlert } from "@yieldmind/db"

// ─────────────────────────────────────────────────────────────
// useRealtimeAlerts
// Live-streams risk alerts from Supabase Realtime.
// ─────────────────────────────────────────────────────────────

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = getBrowserClient()

    // Initial fetch
    supabase
      .from("risk_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data?.length) setAlerts(data) })

    const channel = supabase
      .channel("risk_alerts_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "risk_alerts" },
        (payload) => {
          setAlerts((prev) => [payload.new as RiskAlert, ...prev])
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "risk_alerts" },
        (payload) => {
          const updated = payload.new as RiskAlert
          setAlerts((prev) => prev.map((a) => a.id === updated.id ? updated : a))
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"))

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeAlerts = alerts.filter((a) => !a.resolved)

  return { alerts, activeAlerts, connected }
}
