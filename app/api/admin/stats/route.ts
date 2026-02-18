import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ALL_COUNTRIES = [
  { name: "France", code: "fr" },
  { name: "Italy", code: "it" },
  { name: "Spain", code: "es" },
  { name: "Portugal", code: "pt" },
  { name: "Germany", code: "de" },
  { name: "United Kingdom", code: "gb" },
  { name: "Belgium", code: "be" },
  { name: "Netherlands", code: "nl" },
  { name: "Switzerland", code: "ch" },
  { name: "Albania", code: "al" },
  { name: "Turkey", code: "tr" },
  { name: "Arabia", code: "sa" },
  { name: "Balkans", code: "rs" },
  { name: "Russia", code: "ru" },
  { name: "Romania", code: "ro" },
  { name: "Poland", code: "pl" },
  { name: "Bulgaria", code: "bg" },
]

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

    let totalChannelsAllCountries = 0
    const channelCounts: Record<string, number> = {}

    // Use the new TvVoo multi-country config path
    const configPath = "cfg-it-uk-fr-de-pt-es-al-tr-nl-ar-bk-ru-ro-pl-bg-res"
    
    try {
      const manifestUrl = `https://tvvoo.hayd.uk/${configPath}/manifest.json`
      const manifestRes = await fetch(manifestUrl, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      })

      if (manifestRes.ok) {
        const manifest = await manifestRes.json()
        const catalogs = manifest.catalogs || []

        // Count channels from all catalogs
        for (const catalog of catalogs) {
          if (catalog.type === "tv") {
            try {
              // Use the new URL format with /genre=Tutti.json
              const catalogUrl = `https://tvvoo.hayd.uk/${configPath}/catalog/tv/${catalog.id}/genre=Tutti.json`
              const catalogRes = await fetch(catalogUrl, {
                signal: AbortSignal.timeout(10000),
                cache: "no-store",
              })

              if (catalogRes.ok) {
                const catalogData = await catalogRes.json()
                const count = (catalogData.metas || []).length
                
                // Extract country from catalog name (e.g., "vavoo_tv_fr" -> "France")
                const catalogCountry = catalog.name || catalog.id
                totalChannelsAllCountries += count
                
                console.log(`[v0] ${catalogCountry}: ${count} channels`)
              }
            } catch (catalogError) {
              console.error(`[v0] Failed to fetch catalog ${catalog.id}:`, catalogError)
            }
          }
        }
      }
    } catch (e) {
      console.error(`[v0] Failed to fetch manifest:`, e)
    }

    console.log("[v0] Total channels from all countries:", totalChannelsAllCountries)

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
      .select("id, user_id, channel_id, channel_name")
      .gte("last_heartbeat", fiveMinutesAgo)

    const membersOnline = activeSessions?.filter((s) => s.user_id).length || 0
    const guestsOnline = (activeSessions?.length || 0) - membersOnline
    const totalOnline = activeSessions?.length || 0

    const sessionsWatching = activeSessions?.filter((s) => s.channel_id && s.channel_name) || []
    const liveViewersCount = sessionsWatching.length

    const channelViewers: Record<string, { name: string; count: number }> = {}
    sessionsWatching.forEach((session) => {
      if (session.channel_id && session.channel_name) {
        if (!channelViewers[session.channel_id]) {
          channelViewers[session.channel_id] = { name: session.channel_name, count: 0 }
        }
        channelViewers[session.channel_id].count++
      }
    })

    const currentlyWatching = Object.entries(channelViewers)
      .map(([channel_id, data]) => ({
        channel_id,
        channel_name: data.name,
        viewer_count: data.count,
      }))
      .sort((a, b) => b.viewer_count - a.viewer_count)
      .slice(0, 10)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentViews } = await supabase
      .from("channel_views")
      .select("channel_id, channel_name")
      .gte("viewed_at", oneHourAgo)

    const viewCounts = recentViews?.reduce((acc: Record<string, { name: string; count: number }>, view) => {
      if (view.channel_id && view.channel_name) {
        if (!acc[view.channel_id]) {
          acc[view.channel_id] = { name: view.channel_name, count: 0 }
        }
        acc[view.channel_id].count++
      }
      return acc
    }, {})

    const topChannels = Object.entries(viewCounts || {})
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

    // Use real-time data from active sessions for Top Chaînes
    const topChannelsRealTime = currentlyWatching.map((c) => ({
      channel_id: c.channel_id,
      channel_name: c.channel_name,
      view_count: c.viewer_count,
    }))

    // If we have real-time data, use it. Otherwise fallback to historical data
    const finalTopChannels = topChannelsRealTime.length > 0 ? topChannelsRealTime : topChannels

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalChannels: totalChannelsAllCountries,
      channelsByCountry: channelCounts,
      totalFavorites: totalFavorites || 0,
      vipUsers: vipUsers || 0,
      adminUsers: adminUsers || 0,
      membersOnline,
      guestsOnline,
      onlineUsers: totalOnline,
      liveViewers: liveViewersCount,
      topChannels: finalTopChannels,
      currentlyWatching,
      viewsPerDay: dailyStats || {},
    })
  } catch (error) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
