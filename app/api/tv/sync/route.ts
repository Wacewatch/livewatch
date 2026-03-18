import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const TVVOO_BASE = "https://tvvoo.hayd.uk/cfg-it-uk-fr-de-pt-es-al-tr-nl-ar-bk-ru-ro-pl-bg-res"

const ALL_CATALOGS = [
  { id: "vavoo_tv_fr",  country: "fr" },
  { id: "vavoo_tv_it",  country: "it" },
  { id: "vavoo_tv_uk",  country: "uk" },
  { id: "vavoo_tv_de",  country: "de" },
  { id: "vavoo_tv_pt",  country: "pt" },
  { id: "vavoo_tv_es",  country: "es" },
  { id: "vavoo_tv_al",  country: "al" },
  { id: "vavoo_tv_tr",  country: "tr" },
  { id: "vavoo_tv_nl",  country: "nl" },
  { id: "vavoo_tv_ar",  country: "ar" },
  { id: "vavoo_tv_bk",  country: "bk" },
  { id: "vavoo_tv_ru",  country: "ru" },
  { id: "vavoo_tv_ro",  country: "ro" },
  { id: "vavoo_tv_pl",  country: "pl" },
  { id: "vavoo_tv_bg",  country: "bg" },
]

export const maxDuration = 300

// Appelable depuis le navigateur en GET aussi
export async function GET(request: Request) {
  return POST(request)
}

export async function POST(request: Request) {
  // Optionnel : protection par secret header
  const secret = request.headers.get("x-sync-secret")
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()
  const supabase = await createClient()

  console.log("[v0] Starting full catalog sync for all countries...")

  // Créer un log de sync
  const { data: syncLog } = await supabase
    .from("catalog_sync_log")
    .insert({ started_at: new Date().toISOString(), status: "running" })
    .select()
    .single()

  try {
    const allChannels: any[] = []
    const results: Record<string, number> = {}

    // Fetch tous les pays en parallèle
    const fetchResults = await Promise.allSettled(
      ALL_CATALOGS.map(async (catalog) => {
        const url = `${TVVOO_BASE}/catalog/tv/${catalog.id}/genre=Tutti.json`
        console.log(`[v0] Fetching: ${url}`)
        const response = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "Stremio/4.4" },
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        })
        if (!response.ok) {
          console.log(`[v0] Failed catalog ${catalog.id}: ${response.status}`)
          return { country: catalog.country, metas: [] as any[] }
        }
        const data = await response.json()
        const metas: any[] = data.metas ?? []
        console.log(`[v0] ${catalog.country}: ${metas.length} channels`)
        return { country: catalog.country, metas }
      })
    )

    for (const result of fetchResults) {
      if (result.status === "rejected") {
        console.log(`[v0] Fetch rejected:`, result.reason)
        continue
      }
      const { country, metas } = result.value
      results[country] = metas.length
      for (const ch of metas) {
        allChannels.push({
          id:          ch.id,
          name:        ch.name,
          category:    ch.genres?.[0] ?? ch.category ?? null,
          language:    country,
          logo:        ch.logo ?? ch.poster ?? null,
          background:  ch.poster ?? null,
          sources:     [{ id: ch.id, quality: "Auto", url: ch.id }],
          quality:     "Auto",
          last_synced: new Date().toISOString(),
          enabled:     true,
        })
      }
    }

    console.log(`[v0] Total raw channels: ${allChannels.length}`)

    // Dédupliquer par id
    const dedupedMap = new Map<string, any>()
    for (const ch of allChannels) dedupedMap.set(ch.id, ch)
    const deduped = Array.from(dedupedMap.values())

    console.log(`[v0] After dedup: ${deduped.length}`)

    // Upsert par batches de 300
    let upsertErrors = 0
    for (let i = 0; i < deduped.length; i += 300) {
      const batch = deduped.slice(i, i + 300)
      const { error } = await supabase
        .from("catalog_cache")
        .upsert(batch, { onConflict: "id" })
      if (error) {
        upsertErrors++
        console.log(`[v0] Upsert error at batch ${i}:`, error.message)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[v0] Sync done in ${duration}ms — ${deduped.length} channels, ${upsertErrors} errors`)

    if (syncLog?.id) {
      await supabase
        .from("catalog_sync_log")
        .update({
          completed_at:    new Date().toISOString(),
          channels_synced: deduped.length,
          status:          upsertErrors > 0 ? "partial" : "success",
          duration_ms:     duration,
        })
        .eq("id", syncLog.id)
    }

    return NextResponse.json({
      success:         true,
      channels_synced: deduped.length,
      duration_ms:     duration,
      upsert_errors:   upsertErrors,
      by_country:      results,
    })
  } catch (error: any) {
    console.log("[v0] Catalog sync error:", error.message)
    if (syncLog?.id) {
      await supabase
        .from("catalog_sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status:       "error",
          error:        error.message,
          duration_ms:  Date.now() - startTime,
        })
        .eq("id", syncLog.id)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
