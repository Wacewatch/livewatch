import { NextResponse } from "next/server"
import { fetchTvVooCatalog, fetchTvVooManifest } from "@/lib/tvvoo-backend"

const channelsCache: Map<string, { data: any[]; timestamp: number }> = new Map()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

function extractQuality(name: string): string {
  const upperName = name.toUpperCase()
  if (upperName.includes("4K") || upperName.includes("UHD")) return "4K"
  if (upperName.includes("FHD") || upperName.includes("FULL HD")) return "FHD"
  if (upperName.includes(" HD") || upperName.endsWith("HD")) return "HD"
  if (upperName.includes(" SD") || upperName.endsWith("SD")) return "SD"
  return "HD" // Default
}

function extractCategory(id: string, name: string): string {
  const lowerName = name.toLowerCase()
  const lowerId = id.toLowerCase()

  // Check for group in ID (format: vavoo_NAME|group:category)
  const groupMatch = lowerId.match(/\|group:(\w+)/)
  if (groupMatch) {
    const group = groupMatch[1]
    // Map common groups
    const groupMap: Record<string, string> = {
      sport: "Sport",
      sports: "Sport",
      news: "Actualités",
      info: "Actualités",
      kids: "Enfants",
      children: "Enfants",
      movie: "Cinéma",
      movies: "Cinéma",
      film: "Cinéma",
      music: "Musique",
      documentary: "Documentaire",
      doc: "Documentaire",
      entertainment: "Divertissement",
      general: "Généraliste",
    }
    if (groupMap[group]) return groupMap[group]
  }

  // Detect from channel name
  if (
    lowerName.includes("sport") ||
    lowerName.includes("bein") ||
    lowerName.includes("canal+ sport") ||
    lowerName.includes("eurosport") ||
    lowerName.includes("rmc sport") ||
    lowerName.includes("dazn") ||
    lowerName.includes("foot") ||
    lowerName.includes("golf") ||
    lowerName.includes("equipe")
  ) {
    return "Sport"
  }
  if (
    lowerName.includes("news") ||
    lowerName.includes("info") ||
    lowerName.includes("bfm") ||
    lowerName.includes("cnews") ||
    lowerName.includes("lci") ||
    lowerName.includes("france 24")
  ) {
    return "Actualités"
  }
  if (
    lowerName.includes("disney") ||
    lowerName.includes("nick") ||
    lowerName.includes("cartoon") ||
    lowerName.includes("gulli") ||
    lowerName.includes("piwi") ||
    lowerName.includes("tfou") ||
    lowerName.includes("boomerang") ||
    lowerName.includes("j-one")
  ) {
    return "Enfants"
  }
  if (
    lowerName.includes("cine") ||
    lowerName.includes("cinema") ||
    lowerName.includes("movie") ||
    lowerName.includes("canal+") ||
    lowerName.includes("ocs") ||
    lowerName.includes("paramount") ||
    lowerName.includes("tcm") ||
    lowerName.includes("action")
  ) {
    return "Cinéma"
  }
  if (
    lowerName.includes("mtv") ||
    lowerName.includes("nrj") ||
    lowerName.includes("trace") ||
    lowerName.includes("mezzo") ||
    lowerName.includes("music")
  ) {
    return "Musique"
  }
  if (
    lowerName.includes("national geo") ||
    lowerName.includes("discovery") ||
    lowerName.includes("histoire") ||
    lowerName.includes("planete") ||
    lowerName.includes("ushuaia") ||
    lowerName.includes("science")
  ) {
    return "Documentaire"
  }
  if (
    lowerName.includes("tf1") ||
    lowerName.includes("france 2") ||
    lowerName.includes("france 3") ||
    lowerName.includes("m6") ||
    lowerName.includes("w9") ||
    lowerName.includes("tmc") ||
    lowerName.includes("rts") ||
    lowerName.includes("rtl") ||
    lowerName.includes("tnt")
  ) {
    return "Généraliste"
  }

  return "Divers"
}

function extractLanguage(country: string, name: string): string {
  const countryLangMap: Record<string, string> = {
    France: "FR",
    Italy: "IT",
    Spain: "ES",
    Portugal: "PT",
    Germany: "DE",
    UK: "EN",
    "United Kingdom": "EN",
    Belgium: "FR/NL",
    Netherlands: "NL",
    Switzerland: "FR/DE",
    USA: "EN",
    Albania: "AL",
    Turkey: "TR",
    Arabia: "AR",
    Balkans: "RS",
    Russia: "RU",
    Romania: "RO",
    Poland: "PL",
    Bulgaria: "BG",
  }

  // Check for language indicators in name
  const lowerName = name.toLowerCase()
  if (lowerName.includes("(fr)") || lowerName.includes("[fr]") || lowerName.includes(" fr ")) return "FR"
  if (lowerName.includes("(en)") || lowerName.includes("[en]") || lowerName.includes(" en ")) return "EN"
  if (lowerName.includes("(es)") || lowerName.includes("[es]") || lowerName.includes(" es ")) return "ES"
  if (lowerName.includes("(it)") || lowerName.includes("[it]") || lowerName.includes(" it ")) return "IT"
  if (lowerName.includes("(de)") || lowerName.includes("[de]") || lowerName.includes(" de ")) return "DE"

  return countryLangMap[country] || country.substring(0, 2).toUpperCase()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const countriesParam = searchParams.get("countries")
  const countries = countriesParam ? countriesParam.split(",") : ["France"]

  const cacheKey = countries.join(",")
  const cached = channelsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("[v0] Serving channels from cache for:", cacheKey)
    console.log("[v0] Cache data length:", cached.data?.length)
    return NextResponse.json(cached.data || [])
  }

  try {
    console.log("[v0] Loading TvVoo channels for countries:", countries)

    const manifest = await fetchTvVooManifest(countries)

    if (!manifest) {
      console.error("[v0] Failed to load manifest from TvVoo")
      return NextResponse.json({ error: "Failed to load manifest" }, { status: 500 })
    }

    // Map country to TvVoo catalog ID
    const countryCodeMap: Record<string, string> = {
      France: "fr",
      Italy: "it",
      Spain: "es",
      Portugal: "pt",
      Germany: "de",
      UK: "uk",
      "United Kingdom": "uk",
      Belgium: "be",
      Netherlands: "nl",
      Switzerland: "ch",
      Albania: "al",
      Turkey: "tr",
      Arabia: "ar",
      Balkans: "bk",
      Russia: "ru",
      Romania: "ro",
      Poland: "pl",
      Bulgaria: "bg",
    }

    const countryCode = countryCodeMap[countries[0]] || "fr"
    const catalogId = `vavoo_tv_${countryCode}`

    console.log("[v0] Looking for catalog:", catalogId, "for country:", countries[0])

    let tvCatalog = manifest.catalogs?.find((c) => c.type === "tv" && c.id === catalogId)

    if (!tvCatalog) {
      console.error("[v0] No TV catalog found for", catalogId)
      // Fallback to first available TV catalog
      tvCatalog = manifest.catalogs?.find((c) => c.type === "tv")
      if (!tvCatalog) {
        return NextResponse.json({ error: "No TV catalog available" }, { status: 500 })
      }
      console.log("[v0] Using fallback catalog:", tvCatalog.id)
    } else {
      console.log("[v0] Found catalog:", tvCatalog.name)
    }

    const catalog = await fetchTvVooCatalog(countries, "tv", tvCatalog.id)

    if (!catalog || !catalog.metas) {
      console.error("[v0] Failed to load catalog from TvVoo")
      return NextResponse.json({ error: "Failed to load channels" }, { status: 500 })
    }

    const channels = catalog.metas.map((meta) => {
      const quality = extractQuality(meta.name)
      const category = meta.category || extractCategory(meta.id, meta.name)
      const language = extractLanguage(countries[0], meta.name)

      return {
        id: meta.id,
        baseId: meta.id,
        name: meta.name,
        baseName: meta.name,
        logo: meta.logo && !meta.logo.includes("tvvoo") ? meta.logo : null,
        poster: meta.poster && !meta.poster.includes("tvvoo") ? meta.poster : null,
        background: meta.poster && !meta.poster.includes("tvvoo") ? meta.poster : null,
        country: meta.country || countries[0],
        category,
        quality,
        language,
        sources: [{ name: meta.name, url: "", quality, priority: 1 }],
        enabled: true,
      }
    })

    console.log("[v0] Channels loaded:", channels.length)
    
    channelsCache.set(cacheKey, {
      data: channels,
      timestamp: Date.now(),
    })

    console.log("[v0] Returning channels:", channels.length)
    return NextResponse.json(channels)
  } catch (error) {
    console.error("[v0] Error loading TvVoo channels:", error)
    return NextResponse.json({ error: "Failed to load channels" }, { status: 500 })
  }
}
