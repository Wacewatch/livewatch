import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { sessionId, durationSeconds } = await request.json()

    console.log("[v0] Stopping session:", sessionId, "duration:", durationSeconds, "seconds")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const { data: session, error: fetchError } = await supabase
      .from("active_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (fetchError) {
      console.error("[v0] Failed to fetch session:", fetchError)
    }

    if (session) {
      console.log("[v0] Recording view for channel:", session.channel_name)

      const { error: insertError } = await supabase.from("channel_views").insert({
        channel_id: session.channel_id,
        channel_name: session.channel_name,
        user_id: session.user_id,
        duration_seconds: durationSeconds || 0,
      })

      if (insertError) {
        console.error("[v0] Failed to insert channel view:", insertError)
      }

      const { error: deleteError } = await supabase.from("active_sessions").delete().eq("id", sessionId)

      if (deleteError) {
        console.error("[v0] Failed to delete session:", deleteError)
      } else {
        console.log("[v0] Session stopped and view recorded successfully")
      }
    } else {
      console.warn("[v0] Session not found:", sessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Stop tracking error:", error)
    return NextResponse.json({ error: "Failed to stop tracking" }, { status: 500 })
  }
}
