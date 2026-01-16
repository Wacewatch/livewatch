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

    const { data: allChannels } = await supabase.from("channels").select("id, country_id")

    const totalChannels = allChannels?.length || 0

    const { data: allCountries } = await supabase.from("countries").select("id")

    const totalCountries = allCountries?.length || 0

    const { count: totalUsers } = await supabase.from("user_profiles").select("id", { count: "exact", head: true })
    const { count: vipUsers } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "vip")
    const { count: adminUsers } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: activeSessions } = await supabase
      .from("active_sessions")
      .select("user_id")
      .gte("last_heartbeat", fiveMinutesAgo)

    const onlineUsers = activeSessions?.length || 0

    const { data: proxies } = await supabase.from("proxy_pool").select("is_active")

    const totalProxies = proxies?.length || 0
    const activeProxies = proxies?.filter((p) => p.is_active).length || 0

    return NextResponse.json({
      totalChannels,
      totalCountries,
      totalUsers: totalUsers || 0,
      vipUsers: vipUsers || 0,
      adminUsers: adminUsers || 0,
      onlineUsers,
      activeProxies,
      totalProxies,
    })
  } catch (error) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
