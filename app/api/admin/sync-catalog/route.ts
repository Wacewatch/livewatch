import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const CATALOG_API = "https://apis.wavewatch.xyz/api.php?action=catalog&type=tv&id=vavoo_tv_fr"

export async function POST() {
  const startTime = Date.now()
  const supabase = await createClient()

  // Check admin auth
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

  console.log("[v0] Starting catalog sync...")

  // Create sync log entry
  const { data: syncLog } = await supabase
    .from("catalog_sync_log")
    .insert({
      started_at: new Date().toISOString(),
      status: "running",
    })
    .select()
    .single()

  try {
    // Fetch catalog from external API
    const response = await fetch(CATALOG_API)
    if (!response.ok) {
      throw new Error(`Catalog API returned ${response.status}`)
    }

    const data = await response.json()
    const channels = data.metas || []

    console.log(`[v0] Fetched ${channels.length} channels from catalog`)

    // Clear old cache
    await supabase.from("catalog_cache").delete().neq("id", "")

    // Insert new channels
    const channelsToInsert = channels.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      category: channel.category,
      language: channel.language,
      logo: channel.logo,
      background: channel.poster,
      sources: JSON.stringify([
        {
          id: channel.id,
          quality: "Auto",
          url: channel.id,
        },
      ]),
      quality: "Auto",
      last_synced: new Date().toISOString(),
      enabled: true,
    }))

    // Insert in batches of 100
    for (let i = 0; i < channelsToInsert.length; i += 100) {
      const batch = channelsToInsert.slice(i, i + 100)
      await supabase.from("catalog_cache").insert(batch)
    }

    const duration = Date.now() - startTime

    // Update sync log
    await supabase
      .from("catalog_sync_log")
      .update({
        completed_at: new Date().toISOString(),
        channels_synced: channels.length,
        status: "success",
        duration_ms: duration,
      })
      .eq("id", syncLog.id)

    console.log(`[v0] Catalog sync completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      channels_synced: channels.length,
      duration_ms: duration,
    })
  } catch (error: any) {
    console.error("[v0] Catalog sync error:", error)

    await supabase
      .from("catalog_sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "error",
        error: error.message,
        duration_ms: Date.now() - startTime,
      })
      .eq("id", syncLog.id)

    return NextResponse.json({ error: "Sync failed", message: error.message }, { status: 500 })
  }
}

// Get sync status
export async function GET() {
  const supabase = await createClient()

  const { data: lastSync } = await supabase
    .from("catalog_sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .single()

  const { count } = await supabase.from("catalog_cache").select("*", { count: "exact", head: true })

  return NextResponse.json({
    last_sync: lastSync,
    cached_channels: count || 0,
  })
}
