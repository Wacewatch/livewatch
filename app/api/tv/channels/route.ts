import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * GET /api/tv/channels
 *
 * API publique listant toutes les chaines TV de tous les pays.
 *
 * Paramètres optionnels :
 *   country  – filtre par code pays (ex: "fr", "uk") ou nom (ex: "France")
 *   category – filtre par catégorie (ex: "sport", "news")
 *   search   – recherche par nom (insensible à la casse)
 *   limit    – nombre de résultats (défaut: tous, ex: 100)
 *   offset   – pagination (défaut: 0)
 *
 * Exemples :
 *   /api/tv/channels
 *   /api/tv/channels?country=fr
 *   /api/tv/channels?category=sport&limit=50
 *   /api/tv/channels?search=tf1
 */
export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url)
    const origin = reqUrl.origin

    const countryFilter = reqUrl.searchParams.get("country")?.toLowerCase() ?? null
    const categoryFilter = reqUrl.searchParams.get("category")?.toLowerCase() ?? null
    const searchFilter = reqUrl.searchParams.get("search")?.toLowerCase() ?? null
    const limitParam = reqUrl.searchParams.get("limit")
    const limit = limitParam ? Math.max(1, Number(limitParam)) : null
    const offset = Math.max(Number(reqUrl.searchParams.get("offset") ?? "0"), 0)

    const supabase = await createClient()

    // --- Charger catalog_cache en paginant (Supabase max 1000/page) ---
    let allCatalog: any[] = []
    let page = 0
    const PAGE_SIZE = 1000
    while (true) {
      const { data, error } = await supabase
        .from("catalog_cache")
        .select("id, name, logo, category, language, enabled, last_synced")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) {
        return NextResponse.json(
          { error: "Database error", details: error.message },
          { status: 500 },
        )
      }
      allCatalog = allCatalog.concat(data ?? [])
      if (!data || data.length < PAGE_SIZE) break
      page++
    }

    // --- Charger les tables annexes en parallèle ---
    const [overridesResult, disabledResult, countriesResult, syncResult] = await Promise.all([
      supabase.from("channel_overrides").select("channel_id, custom_logo, custom_name"),
      supabase.from("disabled_channels").select("channel_id"),
      supabase.from("delta_countries").select("id, name, flag"),
      supabase
        .from("sync_logs")
        .select("completed_at, channels_synced, status")
        .eq("status", "success")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // --- Maps de lookup ---
    const overridesMap = new Map<string, { logo?: string; name?: string }>()
    for (const o of (overridesResult.data ?? [])) {
      overridesMap.set(o.channel_id, {
        logo: o.custom_logo ?? undefined,
        name: o.custom_name ?? undefined,
      })
    }

    const disabledSet = new Set<string>(
      (disabledResult.data ?? []).map((d: any) => d.channel_id),
    )

    const countriesMap = new Map<string, { name: string; flag: string }>()
    for (const c of (countriesResult.data ?? [])) {
      countriesMap.set(c.id.toLowerCase(), { name: c.name, flag: c.flag ?? "" })
    }

    // Extraire le code pays depuis l'ID: "vavoo_NAME|group:XX" → "xx"
    function extractCountryCode(id: string): string | null {
      const match = id.match(/\|group:([a-z]{2,3})$/i)
      return match ? match[1].toLowerCase() : null
    }

    // Décoder proprement l'ID pour éviter le double-encodage
    function safeDecodeId(id: string): string {
      try { return decodeURIComponent(id) } catch { return id }
    }

    // --- Transformer les chaines ---
    let channels = allCatalog
      .filter((ch) => ch.enabled !== false && !disabledSet.has(ch.id))
      .map((ch) => {
        const override = overridesMap.get(ch.id)
        const countryCode = extractCountryCode(ch.id)
        const countryInfo = countryCode ? countriesMap.get(countryCode) : null

        return {
          id: ch.id,
          name: override?.name ?? ch.name ?? "Unknown",
          country: countryInfo?.name ?? countryCode?.toUpperCase() ?? "Unknown",
          country_code: countryCode ?? null,
          country_flag: countryInfo?.flag ?? null,
          category: ch.category ?? "General",
          language: ch.language ?? countryCode ?? null,
          logo_url: override?.logo ?? ch.logo ?? null,
          embed_url: `${origin}/player?url=${encodeURIComponent(safeDecodeId(ch.id))}`,
        }
      })

    // --- Filtres ---
    if (countryFilter) {
      channels = channels.filter(
        (ch) =>
          (ch.country_code ?? "").toLowerCase() === countryFilter ||
          ch.country.toLowerCase().includes(countryFilter),
      )
    }
    if (categoryFilter) {
      channels = channels.filter((ch) =>
        ch.category.toLowerCase().includes(categoryFilter),
      )
    }
    if (searchFilter) {
      channels = channels.filter((ch) =>
        ch.name.toLowerCase().includes(searchFilter),
      )
    }

    // --- Tri : pays puis nom ---
    channels.sort((a, b) => {
      const cc = (a.country_code ?? "").localeCompare(b.country_code ?? "")
      return cc !== 0 ? cc : a.name.localeCompare(b.name)
    })

    // --- Statistiques pays ---
    const countriesStats: Record<string, {
      code: string; name: string; flag: string | null; channel_count: number
    }> = {}
    for (const ch of channels) {
      const code = ch.country_code ?? "unknown"
      if (!countriesStats[code]) {
        countriesStats[code] = {
          code,
          name: ch.country,
          flag: ch.country_flag,
          channel_count: 0,
        }
      }
      countriesStats[code].channel_count++
    }
    const countriesList = Object.values(countriesStats).sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    // --- Pagination ---
    const total = channels.length
    const paged = limit !== null
      ? channels.slice(offset, offset + limit)
      : channels.slice(offset)

    // --- Réponse ---
    return NextResponse.json(
      {
        api: "LiveWatch TV Channels",
        version: "2.0",
        updated_at: syncResult.data?.completed_at ?? null,
        channels_synced: syncResult.data?.channels_synced ?? total,
        total,
        returned: paged.length,
        offset,
        limit: limit ?? "none",
        filters_applied: {
          country: countryFilter ?? null,
          category: categoryFilter ?? null,
          search: searchFilter ?? null,
        },
        countries: {
          total: countriesList.length,
          list: countriesList,
        },
        channels: paged,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    )
  } catch (err: any) {
    console.error("[api/tv/channels] Unexpected error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: err?.message ?? "Unknown" },
      { status: 500 },
    )
  }
}