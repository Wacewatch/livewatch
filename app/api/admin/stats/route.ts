import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is admin
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

    // Get statistics
    const { count: totalUsers } = await supabase.from("user_profiles").select("*", { count: "exact", head: true })

    const { count: totalChannels } = await supabase.from("channels").select("*", { count: "exact", head: true })

    const { count: enabledChannels } = await supabase
      .from("channels")
      .select("*", { count: "exact", head: true })
      .eq("enabled", true)

    const { count: totalFavorites } = await supabase.from("user_favorites").select("*", { count: "exact", head: true })

    const { count: vipUsers } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "vip")

    const { count: adminUsers } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalChannels: totalChannels || 0,
      enabledChannels: enabledChannels || 0,
      totalFavorites: totalFavorites || 0,
      vipUsers: vipUsers || 0,
      adminUsers: adminUsers || 0,
    })
  } catch (error) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
