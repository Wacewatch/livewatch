import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * GET /api/tv/channels
 *
 * Retourne toutes les chaines depuis catalog_cache (source principale),
 * enrichies avec channel_overrides (logo/nom custom prioritaires),
 * filtrées par disabled_channels, et enrichies du pays via delta_countries.
 *
 * Query params:
 *   country  – filtre par code pays ISO (ex: "fr", "uk") ou nom (ex: "France")
 *   category – filtre par catégorie (ex: "sport")
 *   search   – recherche par nom (insensible à la casse)
 *   limit    – max résultats (défaut 200, max 1000)
 *   offset   – pagination (défaut 0)
 */
export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url)
    const origin = reqUrl.origin

    const countryFilter  = reqUrl.searchParams.get("country")?.toLowerCase()  ?? null
    const categoryFilter = reqUrl.searchParams.get("category")?.toLowerCase() ?? null
    const searchFilter   = reqUrl.searchParams.get("search")?.toLowerCase()   ?? null
    const limit          = Math.min(Number(reqUrl.searchParams.get("limit")  ?? "200"), 1000)
    const offset         = Math.max(Number(reqUrl.searchParams.get("offset") ?? "0"),    0)

    const supabase = await createClient()

    // 1. Charger catalog_cache en paginant (Supabase limite à 1000 par requête)
    let allCatalog: any[] = []
    let page = 0
    const PAGE_SIZE = 1000
    while (true) {
      const { data, error } = await supabase
        .from("catalog_cache")
        .select("id, name, logo, category, language, enabled")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) {
        return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
      }
      allCatalog = allCatalog.concat(data ?? [])
      if (!data || data.length < PAGE_SIZE) break
      page++
    }

    // Charger les autres tables en parallèle
    const [overridesResult, disabledResult, countriesResult] = await Promise.all([
      supabase.from("channel_overrides").select("channel_id, custom_logo, custom_name"),
      supabase.from("disabled_channels").select("channel_id"),
      supabase.from("delta_countries").select("id, name, flag"),
    ])

    // 2. Construire des maps de lookup
    const overridesMap = new Map<string, { logo?: string; name?: string }>()
    for (const o of (overridesResult.data ?? [])) {
      overridesMap.set(o.channel_id, {
        logo: o.custom_logo ?? undefined,
        name: o.custom_name ?? undefined,
      })
    }

    const disabledSet = new Set<string>((disabledResult.data ?? []).map((d: any) => d.channel_id))

    const countriesMap = new Map<string, { name: string; flag: string }>()
    for (const c of (countriesResult.data ?? [])) {
      countriesMap.set(c.id.toLowerCase(), { name: c.name, flag: c.flag ?? "" })
    }

    // 3. Extraire le code pays depuis l'ID: "vavoo_NAME|group:XX" → "XX"
    function extractCountryCode(id: string): string | null {
      const match = id.match(/\|group:([a-z]{2,3})$/i)
      return match ? match[1].toLowerCase() : null
    }

    // 4. Traiter les chaines
    let channels = (allCatalog)
      .filter((ch) => ch.enabled !== false && !disabledSet.has(ch.id))
      .map((ch) => {
        const override    = overridesMap.get(ch.id)
        const countryCode = extractCountryCode(ch.id)
        const countryInfo = countryCode ? countriesMap.get(countryCode) : null

        const name     = override?.name ?? ch.name ?? "Unknown"
        const logo     = override?.logo ?? ch.logo ?? null
        const country  = countryInfo?.name ?? countryCode?.toUpperCase() ?? "Unknown"
        const flag     = countryInfo?.flag ?? ""
        const category = ch.category ?? "General"
        const language = ch.language ?? countryCode ?? null

        // Décoder d'abord pour éviter le double encodage (les IDs sont déjà partiellement encodés en BDD)
        const rawId = (() => { try { return decodeURIComponent(ch.id) } catch { return ch.id } })()

        return {
          id:           ch.id,
          name,
          country,
          country_code: countryCode,
          country_flag: flag,
          category,
          language,
          logo_url:     logo,
          embed_url:    `${origin}/player?url=${encodeURIComponent(rawId)}`,
        }
      })

    // 5. Appliquer les filtres
    if (countryFilter) {
      channels = channels.filter(
        (ch) =>
          ch.country.toLowerCase().includes(countryFilter) ||
          (ch.country_code ?? "").toLowerCase() === countryFilter,
      )
    }
    if (categoryFilter) {
      channels = channels.filter((ch) => ch.category.toLowerCase().includes(categoryFilter))
    }
    if (searchFilter) {
      channels = channels.filter((ch) => ch.name.toLowerCase().includes(searchFilter))
    }

    // 6. Trier par pays puis nom
    channels.sort((a, b) => {
      const cc = a.country.localeCompare(b.country)
      return cc !== 0 ? cc : a.name.localeCompare(b.name)
    })

    const total = channels.length
    const paged = channels.slice(offset, offset + limit)

    return NextResponse.json(
      { total, limit, offset, channels: paged },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
        },
      },
    )
  } catch (err) {
    console.error("[api/tv/channels] Unexpected error:", err)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
