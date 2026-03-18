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
 *
 * Chaque item retourné :
 * {
 *   "id":        "vavoo_13EME%20RUE|group:fr",
 *   "name":      "13EME RUE",
 *   "country":   "France",
 *   "country_code": "fr",
 *   "country_flag": "🇫🇷",
 *   "category":  "Entertainment",
 *   "language":  "fr",
 *   "logo_url":  "https://...",
 *   "embed_url": "/player?url=vavoo_13EME%2520RUE%7Cgroup%3Afr"
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const countryFilter  = searchParams.get("country")?.toLowerCase()  ?? null
    const categoryFilter = searchParams.get("category")?.toLowerCase() ?? null
    const searchFilter   = searchParams.get("search")?.toLowerCase()   ?? null
    const limit          = Math.min(Number(searchParams.get("limit")  ?? "200"), 1000)
    const offset         = Math.max(Number(searchParams.get("offset") ?? "0"),    0)

    const supabase = await createClient()

    // 1. Charger toutes les données en parallèle
    const [catalogResult, overridesResult, disabledResult, countriesResult] = await Promise.all([
      supabase.from("catalog_cache").select("id, name, logo, category, language, enabled"),
      supabase.from("channel_overrides").select("channel_id, custom_logo, custom_name"),
      supabase.from("disabled_channels").select("channel_id"),
      supabase.from("delta_countries").select("id, name, flag"),
    ])

    if (catalogResult.error) {
      console.error("[api/tv/channels] catalog_cache error:", catalogResult.error)
      return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
    }

    // 2. Construire des maps de lookup
    const overridesMap = new Map<string, { logo?: string; name?: string }>()
    for (const o of overridesResult.data ?? []) {
      overridesMap.set(o.channel_id, {
        logo: o.custom_logo ?? undefined,
        name: o.custom_name ?? undefined,
      })
    }

    const disabledSet = new Set<string>((disabledResult.data ?? []).map((d) => d.channel_id))

    const countriesMap = new Map<string, { name: string; flag: string }>()
    for (const c of countriesResult.data ?? []) {
      countriesMap.set(c.id.toLowerCase(), { name: c.name, flag: c.flag ?? "" })
    }

    // 3. Extraire le code pays depuis l'ID de la chaine
    // Format: "vavoo_NAME|group:XX" → code pays = "XX"
    function extractCountryCode(id: string): string | null {
      const match = id.match(/[|]group:([a-z]{2,3})$/i)
      return match ? match[1].toLowerCase() : null
    }

    // 4. Traiter et filtrer les chaines
    let channels = (catalogResult.data ?? [])
      .filter((ch) => ch.enabled !== false && !disabledSet.has(ch.id))
      .map((ch) => {
        const override = overridesMap.get(ch.id)
        const countryCode = extractCountryCode(ch.id)
        const countryInfo = countryCode ? countriesMap.get(countryCode) : null

        const name     = override?.name ?? ch.name ?? "Unknown"
        const logo     = override?.logo ?? ch.logo ?? null
        const country  = countryInfo?.name ?? countryCode?.toUpperCase() ?? "Unknown"
        const flag     = countryInfo?.flag ?? ""
        const category = ch.category ?? "General"
        const language = ch.language ?? countryCode ?? null

        return {
          id:           ch.id,
          name,
          country,
          country_code: countryCode,
          country_flag: flag,
          category,
          language,
          logo_url:     logo,
          // embed_url = /player?url=<id encodé une fois>
          embed_url:    `/player?url=${encodeURIComponent(ch.id)}`,
        }
      })

    // 5. Appliquer les filtres
    if (countryFilter) {
      channels = channels.filter(
        (ch) =>
          ch.country.toLowerCase().includes(countryFilter) ||
          (ch.country_code ?? "").toLowerCase() === countryFilter
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

    const total   = channels.length
    const paged   = channels.slice(offset, offset + limit)

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
