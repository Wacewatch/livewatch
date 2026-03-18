import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const TVVOO_BASE = "https://tvvoo.hayd.uk/cfg-it-uk-fr-de-pt-es-al-tr-nl-ar-bk-ru-ro-pl-bg-res"

// Tous les catalogues disponibles dans le manifest TvVoo
const ALL_CATALOGS = [
  { id: "vavoo_tv_fr", country: "fr" },
  { id: "vavoo_tv_it", country: "it" },
  { id: "vavoo_tv_uk", country: "uk" },
  { id: "vavoo_tv_de", country: "de" },
  { id: "vavoo_tv_pt", country: "pt" },
  { id: "vavoo_tv_es", country: "es" },
  { id: "vavoo_tv_al", country: "al" },
  { id: "vavoo_tv_tr", country: "tr" },
  { id: "vavoo_tv_nl", country: "nl" },
  { id: "vavoo_tv_ar", country: "ar" },
  { id: "vavoo_tv_bk", country: "bk" },
  { id: "vavoo_tv_ru", country: "ru" },
  { id: "vavoo_tv_ro", country: "ro" },
  { id: "vavoo_tv_pl", country: "pl" },
  { id: "vavoo_tv_bg", country: "bg" },
]

export const maxDuration = 60

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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  console.log("[v0] Starting full catalog sync for all countries...")

  const { data: syncLog } = await supabase
    .from("catalog_sync_log")
    .insert({ started_at: new Date().toISOString(), status: "running" })
    .select()
    .single()

  try {
    const allChannels: any[] = []
    const results: Record<string, number> = {}

    // Fetch chaque pays
    for (const catalog of ALL_CATALOGS) {
      try {
        const url = `${TVVOO_BASE}/catalog/tv/${catalog.id}/genre=Tutti.json`
        const response = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "Stremio/4.4" },
          cache: "no-store",
        })

        if (!response.ok) {
          console.error(`[v0] Failed to fetch catalog ${catalog.id}: ${response.status}`)
          results[catalog.country] = 0
          continue
        }

        const data = await response.json()
        const metas: any[] = data.metas ?? []
        results[catalog.country] = metas.length

        for (const ch of metas) {
          allChannels.push({
            id:          ch.id,
            name:        ch.name,
            category:    ch.genres?.[0] ?? ch.category ?? null,
            language:    ch.language ?? catalog.country,
            logo:        ch.logo ?? ch.poster ?? null,
            background:  ch.poster ?? null,
            sources:     JSON.stringify([{ id: ch.id, quality: "Auto", url: ch.id }]),
            quality:     "Auto",
            last_synced: new Date().toISOString(),
            enabled:     true,
          })
        }

        console.log(`[v0] Fetched ${metas.length} channels for country: ${catalog.country}`)
      } catch (err) {
        console.error(`[v0] Error fetching catalog ${catalog.id}:`, err)
        results[catalog.country] = 0
      }
    }

    console.log(`[v0] Total channels fetched: ${allChannels.length}`)

    // Dédupliquer par id (garder le dernier)
    const dedupedMap = new Map<string, any>()
    for (const ch of allChannels) {
      dedupedMap.set(ch.id, ch)
    }
    const deduped = Array.from(dedupedMap.values())

    console.log(`[v0] Deduped channels: ${deduped.length}`)

    // Vider l'ancienne cache
    await supabase.from("catalog_cache").delete().neq("id", "")

    // Insérer par batches de 200
    for (let i = 0; i < deduped.length; i += 200) {
      const batch = deduped.slice(i, i + 200)
      const { error } = await supabase.from("catalog_cache").insert(batch)
      if (error) {
        console.error(`[v0] Insert error at batch ${i}:`, error.message)
      }
    }

    const duration = Date.now() - startTime

    await supabase
      .from("catalog_sync_log")
      .update({
        completed_at:    new Date().toISOString(),
        channels_synced: deduped.length,
        status:          "success",
        duration_ms:     duration,
      })
      .eq("id", syncLog.id)

    console.log(`[v0] Full sync completed in ${duration}ms — ${deduped.length} channels`)

    return NextResponse.json({
      success:         true,
      channels_synced: deduped.length,
      duration_ms:     duration,
      by_country:      results,
    })
  } catch (error: any) {
    console.error("[v0] Catalog sync error:", error)

    await supabase
      .from("catalog_sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status:       "error",
        error:        error.message,
        duration_ms:  Date.now() - startTime,
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
    last_sync:        lastSync,
    cached_channels:  count ?? 0,
  })
}
