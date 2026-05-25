import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

export async function GET() {
  try {
    const supabase = createServerClient()

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

    const { data: snapshots, error } = await supabase
      .from("yield_snapshots")
      .select("asset_id, apy, timestamp")
      .gte("timestamp", sixHoursAgo)
      .order("timestamp", { ascending: true })

    if (error || !snapshots?.length) {
      // Generate mock chart data
      return NextResponse.json(
        Array.from({ length: 12 }, (_, i) => {
          const t = new Date(Date.now() - (11 - i) * 30 * 60 * 1000)
          return {
            time: t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
            USDY: +(5.15 + Math.random() * 0.12).toFixed(3),
            mETH: +(4.70 + Math.random() * 0.15).toFixed(3),
            USDe: +(8.80 + Math.random() * 0.30).toFixed(3),
            fBTC: +(3.05 + Math.random() * 0.10).toFixed(3),
          }
        })
      )
    }

    // Group by timestamp bucket (30-min intervals)
    const buckets: Record<string, Record<string, number>> = {}
    snapshots.forEach((s) => {
      const d = new Date(s.timestamp)
      d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0)
      const key = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      if (!buckets[key]) buckets[key] = { time: key as any }
      buckets[key][s.asset_id] = s.apy
    })

    return NextResponse.json(Object.values(buckets))
  } catch (err) {
    console.error("[/api/yield] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
