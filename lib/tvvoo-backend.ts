// TvVoo Backend API Integration
// Connects to https://tvvoo.hayd.uk/ to fetch real streams

const TVVOO_BASE_URL = "https://tvvoo.hayd.uk"

// Map common country names to TvVoo country codes
const COUNTRY_MAP: Record<string, string> = {
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
  USA: "us",
  Albania: "al",
  Turkey: "tr",
  Arabia: "ar",
  Balkans: "bk", // Changed from "rs" to "bk" for new system
  Russia: "ru",
  Romania: "ro",
  Poland: "pl",
  Bulgaria: "bg",
}

export interface TvVooManifest {
  id: string
  version: string
  name: string
  description: string
  catalogs: TvVooCatalog[]
  resources: string[]
  types: string[]
  idPrefixes: string[]
}

export interface TvVooCatalog {
  type: string
  id: string
  name: string
}

export interface TvVooMeta {
  id: string
  type: string
  name: string
  poster?: string
  logo?: string
  country?: string
  category?: string
}

export interface TvVooCatalogResponse {
  metas: TvVooMeta[]
}

export interface TvVooStream {
  url: string
  title?: string
  behaviorHints?: {
    notWebReady?: boolean
  }
}

export interface TvVooStreamResponse {
  streams: TvVooStream[]
}

// Build config path from country codes
// The new TvVoo system uses a fixed multi-country config path
function buildConfigPath(countries: string[]): string {
  // New format: cfg-it-uk-fr-de-pt-es-al-tr-nl-ar-bk-ru-ro-pl-bg-res
  // This is a fixed path that includes all supported countries
  return "cfg-it-uk-fr-de-pt-es-al-tr-nl-ar-bk-ru-ro-pl-bg-res"
}

// Fetch manifest from TvVoo
export async function fetchTvVooManifest(countries: string[] = ["France"]): Promise<TvVooManifest | null> {
  try {
    const configPath = buildConfigPath(countries)
    const url = `${TVVOO_BASE_URL}/${configPath}/manifest.json`

    console.log("[v0] Fetching TvVoo manifest:", url)

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Stremio/4.4",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[v0] TvVoo manifest fetch failed:", response.status, response.statusText)
      return null
    }

    const manifest = await response.json()
    console.log("[v0] TvVoo manifest loaded:", manifest.name, "with", manifest.catalogs?.length || 0, "catalogs")
    return manifest
  } catch (error) {
    console.error("[v0] Error fetching TvVoo manifest:", error)
    return null
  }
}

// Fetch catalog from TvVoo
export async function fetchTvVooCatalog(
  countries: string[],
  catalogType: string,
  catalogId: string,
): Promise<TvVooCatalogResponse | null> {
  try {
    const configPath = buildConfigPath(countries)
    // New TvVoo format requires /genre=Tutti to get all channels
    const url = `${TVVOO_BASE_URL}/${configPath}/catalog/${catalogType}/${catalogId}/genre=Tutti.json`

    console.log("[v0] ✅ UPDATED: Using NEW TvVoo format with /genre=Tutti")
    console.log("[v0] Fetching TvVoo catalog:", url)

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Stremio/4.4",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[v0] TvVoo catalog fetch failed:", response.status, response.statusText)
      return null
    }

    const catalog = await response.json()
    console.log("[v0] TvVoo catalog loaded:", catalog.metas?.length || 0, "items")
    return catalog
  } catch (error) {
    console.error("[v0] Error fetching TvVoo catalog:", error)
    return null
  }
}

// Fetch stream from TvVoo
export async function fetchTvVooStream(countries: string[], channelId: string): Promise<TvVooStreamResponse | null> {
  try {
    const configPath = buildConfigPath(countries)
    const url = `${TVVOO_BASE_URL}/${configPath}/stream/tv/${channelId}.json`

    console.log("[v0] Fetching TvVoo stream:", url)

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "VAVOO/2.6",
      },
      cache: "no-cache",
    })

    if (!response.ok) {
      console.error("[v0] TvVoo stream fetch failed:", response.status, response.statusText)
      return null
    }

    const streamData = await response.json()
    console.log("[v0] TvVoo stream loaded:", streamData.streams?.length || 0, "streams")

    return streamData
  } catch (error) {
    console.error("[v0] Error fetching TvVoo stream:", error)
    return null
  }
}

// Get first available stream URL
export async function getTvVooStreamUrl(countries: string[], channelId: string): Promise<string | null> {
  const streamData = await fetchTvVooStream(countries, channelId)

  if (!streamData || !streamData.streams || streamData.streams.length === 0) {
    return null
  }

  return streamData.streams[0].url
}
