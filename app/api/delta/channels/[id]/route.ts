import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Update channel
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { name, logo } = body

    const { data, error } = await supabase
      .from("delta_channels")
      .update({ name, logo, updated_at: new Date().toISOString() })
      .eq("delta_id", params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Delta: Error updating channel:", error)
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 })
  }
}

// Toggle channel enabled/disabled
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Toggle enabled status
    const { data: channel } = await supabase
      .from("delta_channels")
      .select("enabled")
      .eq("delta_id", params.id)
      .single()

    const { data, error } = await supabase
      .from("delta_channels")
      .update({ enabled: !channel?.enabled, updated_at: new Date().toISOString() })
      .eq("delta_id", params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Delta: Error toggling channel:", error)
    return NextResponse.json({ error: "Failed to toggle channel" }, { status: 500 })
  }
}
