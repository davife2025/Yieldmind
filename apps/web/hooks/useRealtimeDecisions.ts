"use client"

import { useEffect, useRef, useState } from "react"
import { getBrowserClient } from "@yieldmind/db"
import type { AgentDecision } from "@yieldmind/db"

// ─────────────────────────────────────────────────────────────
// useRealtimeDecisions
// Subscribes to Supabase Realtime for live agent decision feed.
// New decisions stream in as the agent writes them.
// ─────────────────────────────────────────────────────────────

interface UseRealtimeDecisionsOptions {
  initialDecisions?: AgentDecision[]
  limit?: number
}

export function useRealtimeDecisions({
  initialDecisions = [],
  limit = 20,
}: UseRealtimeDecisionsOptions = {}) {
  const [decisions, setDecisions] = useState<AgentDecision[]>(initialDecisions)
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof getBrowserClient>["channel"]> | null>(null)

  useEffect(() => {
    const supabase = getBrowserClient()

    // Initial fetch
    supabase
      .from("agent_decisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data?.length) setDecisions(data)
      })

    // Realtime subscription
    const channel = supabase
      .channel("agent_decisions_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_decisions" },
        (payload) => {
          const newDecision = payload.new as AgentDecision
          setDecisions((prev) => [newDecision, ...prev].slice(0, limit))
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_decisions" },
        (payload) => {
          const updated = payload.new as AgentDecision
          setDecisions((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          )
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED")
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [limit])

  return { decisions, connected }
}
