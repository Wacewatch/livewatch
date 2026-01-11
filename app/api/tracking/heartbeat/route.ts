import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { sessionId } = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Update heartbeat
    await supabase.from("active_sessions").update({ last_heartbeat: new Date().toISOString() }).eq("id", sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Heartbeat error:", error)
    return NextResponse.json({ error: "Failed to update heartbeat" }, { status: 500 })
  }
}
