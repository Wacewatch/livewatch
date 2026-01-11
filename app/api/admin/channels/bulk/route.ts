import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { ids, enabled } = await request.json()

    const { error } = await supabase
      .from("channels")
      .update({ enabled, updated_at: new Date().toISOString() })
      .in("id", ids)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Bulk channel update error:", error)
    return NextResponse.json({ error: "Failed to bulk update channels" }, { status: 500 })
  }
}
