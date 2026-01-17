import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: channels, error } = await supabase
      .from("disabled_channels")
      .select("*")
      .order("disabled_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ channels: channels || [] })
  } catch (error) {
    console.error("Error fetching disabled channels:", error)
    return NextResponse.json({ channels: [] })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { channel_id, channel_name, reason } = body

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("disabled_channels").upsert(
      {
        channel_id,
        channel_name,
        disabled_by: user?.email || "admin",
        reason: reason || "Désactivée par l'administrateur",
      },
      { onConflict: "channel_id" },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disabling channel:", error)
    return NextResponse.json({ error: "Failed to disable channel" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { channel_id } = body

    const { error } = await supabase.from("disabled_channels").delete().eq("channel_id", channel_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error enabling channel:", error)
    return NextResponse.json({ error: "Failed to enable channel" }, { status: 500 })
  }
}
