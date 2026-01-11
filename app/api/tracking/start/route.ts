import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { channelId, channelName } = await request.json()

    console.log("[v0] Starting session for channel:", channelId, channelName)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const headersList = await headers()
    const userAgent = headersList.get("user-agent") || "Unknown"
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "Unknown"

    const { data: session, error } = await supabase
      .from("active_sessions")
      .insert({
        user_id: user?.id || null,
        channel_id: channelId,
        channel_name: channelName,
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Failed to create session:", error)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    console.log("[v0] Session created successfully:", session?.id)
    return NextResponse.json({ sessionId: session?.id })
  } catch (error) {
    console.error("[v0] Start tracking error:", error)
    return NextResponse.json({ error: "Failed to start tracking" }, { status: 500 })
  }
}
