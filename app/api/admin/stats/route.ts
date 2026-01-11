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

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    await supabase.from("active_sessions").delete().lt("last_heartbeat", fiveMinutesAgo)

    const { count: totalUsers } = await supabase.from("user_profiles").select("id", { count: "exact", head: true })
    const { count: totalChannels } = await supabase.from("channels").select("id", { count: "exact", head: true })
    const { count: enabledChannels } = await supabase
      .from("channels")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true)
    const { count: totalFavorites } = await supabase.from("user_favorites").select("id", { count: "exact", head: true })
    const { count: vipUsers } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "vip")
    const { count: adminUsers } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")

    const { data: activeSessions } = await supabase
      .from("active_sessions")
      .select("user_id")
      .gte("last_heartbeat", fiveMinutesAgo)

    const uniqueUsers = new Set(activeSessions?.map((s) => s.user_id).filter(Boolean))
    const onlineUsers = uniqueUsers.size

    const { count: liveViewers } = await supabase
      .from("active_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_heartbeat", fiveMinutesAgo)

    const { data: currentSessions } = await supabase
      .from("active_sessions")
      .select("channel_id, channel_name")
      .gte("last_heartbeat", fiveMinutesAgo)

    const channelViewers = currentSessions?.reduce((acc: Record<string, { name: string; count: number }>, session) => {
      if (session.channel_id && session.channel_name) {
        if (!acc[session.channel_id]) {
          acc[session.channel_id] = { name: session.channel_name, count: 0 }
        }
        acc[session.channel_id].count++
      }
      return acc
    }, {})

    const currentlyWatching = Object.entries(channelViewers || {})
      .map(([channel_id, data]) => ({
        channel_id,
        channel_name: data.name,
        viewer_count: data.count,
      }))
      .sort((a, b) => b.viewer_count - a.viewer_count)
      .slice(0, 10)

    const { data: recentViews } = await supabase
      .from("channel_views")
      .select("channel_id, channel_name")
      .gte("viewed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const channelCounts = recentViews?.reduce((acc: Record<string, { name: string; count: number }>, view) => {
      if (view.channel_id && view.channel_name) {
        if (!acc[view.channel_id]) {
          acc[view.channel_id] = { name: view.channel_name, count: 0 }
        }
        acc[view.channel_id].count++
      }
      return acc
    }, {})

    const topChannels = Object.entries(channelCounts || {})
      .map(([channel_id, data]) => ({
        channel_id,
        channel_name: data.name,
        view_count: data.count,
      }))
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 10)

    const { data: viewsPerDay } = await supabase
      .from("channel_views")
      .select("viewed_at")
      .gte("viewed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const dailyStats = viewsPerDay?.reduce((acc: Record<string, number>, view) => {
      const date = new Date(view.viewed_at).toLocaleDateString()
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    console.log("[v0] Admin stats:", {
      onlineUsers,
      liveViewers,
      currentlyWatchingCount: currentlyWatching.length,
    })

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalChannels: totalChannels || 0,
      enabledChannels: enabledChannels || 0,
      totalFavorites: totalFavorites || 0,
      vipUsers: vipUsers || 0,
      adminUsers: adminUsers || 0,
      onlineUsers,
      liveViewers: liveViewers || 0,
      topChannels,
      currentlyWatching,
      viewsPerDay: dailyStats || {},
    })
  } catch (error) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
