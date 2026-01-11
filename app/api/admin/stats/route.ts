import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
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

    // Cleanup stale sessions
    await supabase.rpc("cleanup_stale_sessions")

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

    const { count: onlineUsers } = await supabase
      .from("active_sessions")
      .select("user_id", { count: "exact", head: true })

    const { count: liveViewers } = await supabase.from("active_sessions").select("*", { count: "exact", head: true })

    // Get top watched channels
    const { data: topChannels } = await supabase
      .from("channel_views")
      .select("channel_id, channel_name, COUNT(*) as view_count")
      .gte("viewed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("view_count", { ascending: false })
      .limit(10)

    // Get currently watching channels
    const { data: currentlyWatching } = await supabase
      .from("active_sessions")
      .select("channel_id, channel_name, COUNT(*) as viewer_count")
      .gte("last_heartbeat", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("viewer_count", { ascending: false })
      .limit(10)

    // Get views per day for the last 7 days
    const { data: viewsPerDay } = await supabase
      .from("channel_views")
      .select("viewed_at")
      .gte("viewed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const dailyStats = viewsPerDay?.reduce((acc: Record<string, number>, view) => {
      const date = new Date(view.viewed_at).toLocaleDateString()
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalChannels: totalChannels || 0,
      enabledChannels: enabledChannels || 0,
      totalFavorites: totalFavorites || 0,
      vipUsers: vipUsers || 0,
      adminUsers: adminUsers || 0,
      onlineUsers: onlineUsers || 0,
      liveViewers: liveViewers || 0,
      topChannels: topChannels || [],
      currentlyWatching: currentlyWatching || [],
      viewsPerDay: dailyStats || {},
    })
  } catch (error) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
