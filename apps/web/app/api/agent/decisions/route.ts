import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// GET /api/agent/decisions?limit=10
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50)

  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("agent_decisions")
      .select(`
        id,
        type,
        reasoning,
        action_taken,
        tx_hash,
        status,
        asset_id,
        value_delta_usd,
        apy_delta,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ decisions: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
