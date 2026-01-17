import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: overrides, error } = await supabase.from("channel_overrides").select("*")

    if (error) throw error

    return NextResponse.json({ overrides: overrides || [] })
  } catch (error) {
    console.error("Error fetching channel overrides:", error)
    return NextResponse.json({ overrides: [] })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { channel_id, custom_name, custom_logo } = await request.json()

    if (!channel_id) {
      return NextResponse.json({ error: "channel_id is required" }, { status: 400 })
    }

    // Check if override exists
    const { data: existing } = await supabase
      .from("channel_overrides")
      .select("id")
      .eq("channel_id", channel_id)
      .single()

    if (existing) {
      // Update existing override
      const { error } = await supabase
        .from("channel_overrides")
        .update({
          custom_name,
          custom_logo,
          updated_at: new Date().toISOString(),
        })
        .eq("channel_id", channel_id)

      if (error) throw error
    } else {
      // Insert new override
      const { error } = await supabase.from("channel_overrides").insert({
        channel_id,
        custom_name,
        custom_logo,
      })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving channel override:", error)
    return NextResponse.json({ error: "Failed to save channel override" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { channel_id } = await request.json()

    if (!channel_id) {
      return NextResponse.json({ error: "channel_id is required" }, { status: 400 })
    }

    const { error } = await supabase.from("channel_overrides").delete().eq("channel_id", channel_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting channel override:", error)
    return NextResponse.json({ error: "Failed to delete channel override" }, { status: 500 })
  }
}
