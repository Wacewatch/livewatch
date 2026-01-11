import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { sessionId, durationSeconds } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Get session details
    const { data: session } = await supabase.from("active_sessions").select("*").eq("id", sessionId).single()

    if (session) {
      // Record view
      await supabase.from("channel_views").insert({
        channel_id: session.channel_id,
        channel_name: session.channel_name,
        user_id: session.user_id,
        duration_seconds: durationSeconds || 0,
      })

      // Delete session
      await supabase.from("active_sessions").delete().eq("id", sessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Stop tracking error:", error)
    return NextResponse.json({ error: "Failed to stop tracking" }, { status: 500 })
  }
}
