import { NextResponse } from "next/server"
import { createServerClient } from "@yieldmind/db"

// GET /api/alerts
export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("risk_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ alerts: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/alerts — resolve an alert
export async function PATCH(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 })

    const supabase = createServerClient()
    const { error } = await supabase
      .from("risk_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
