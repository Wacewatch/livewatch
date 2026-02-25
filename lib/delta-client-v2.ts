/**
 * Delta Client - Exact implementation of the PHP VAVOO logic
 * Uses ping for token, proper signature headers, and caching
 */

const TOKEN_TTL = 480 // 8 minutes in seconds
const CATALOG_TTL = 3600 // 1 hour in seconds
const PING_URLS = ["https://www.lokke.app/api/app/ping", "https://www.vavoo.tv/api/app/ping"]
const CATALOG_URL = "https://vavoo.to/mediahubmx-catalog.json"
const RESOLVE_URL = "https://vavoo.to/mediahubmx-resolve.json"

export interface DeltaChannel {
  id: string
  name: string
  cleanName: string
  url: string
  logo: string
  country: string
  group: string
  genre: string
  quality: string
}

interface TokenCache {
  sig: string
  ts: number
}

interface CatalogCache {
  channels: DeltaChannel[]
  ts: number
}

/**
 * HTTP POST with proper VAVOO headers
 */
async function httpPost(
  url: string,
  payload: any,
  extraHeaders: Record<string, string> = {},
  timeout = 20000
): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "MediaHubMX/2",
        Accept: "*/*",
        Connection: "close",
        ...extraHeaders,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[v0] Delta httpPost failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("[v0] Delta httpPost error:", error)
    return null
  }
}

/**
 * Generate UUID for device ID
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get addon signature (token) via ping - EXACT PHP implementation
 */
export async function getAddonSig(force = false): Promise<string | null> {
  // Check cache first
  if (!force) {
    const cached = getTokenFromCache()
    if (cached && Date.now() / 1000 - cached.ts < TOKEN_TTL) {
      console.log("[v0] Delta: Using cached token")
      return cached.sig
    }
  }

  const uid = generateUUID()
  const ts = Date.now()

  const payload = {
    reason: "app-focus",
    locale: "en",
    theme: "dark",
    metadata: {
      device: {
        type: "desktop",
        uniqueId: uid,
      },
      os: {
        name: "win32",
        version: "Windows 10 Pro",
        abis: ["x64"],
        host: "Lenovo",
      },
      app: {
        platform: "electron",
      },
      version: {
        package: "tv.vavoo.app",
        binary: "3.1.8",
        js: "3.1.8",
      },
    },
    appFocusTime: 0,
    playerActive: false,
    playDuration: 0,
    devMode: false,
    hasAddon: true,
    castConnected: false,
    package: "tv.vavoo.app",
    version: "3.1.8",
    process: "app",
    firstAppStart: ts,
    lastAppStart: ts,
    ipLocation: null,
    adblockEnabled: true,
    proxy: {
      supported: ["ss"],
      engine: "Mu",
      enabled: false,
      autoServer: true,
    },
    iap: {
      supported: false,
    },
  }

  // Try both ping URLs
  for (const url of PING_URLS) {
    console.log("[v0] Delta: Pinging", url)
    const data = await httpPost(url, payload, {}, 15000)
    if (data && data.addonSig) {
      console.log("[v0] Delta: Got token from ping")
      saveTokenToCache(data.addonSig)
      return data.addonSig
    }
  }

  // Fallback to old cached token if available
  const cached = getTokenFromCache()
  return cached?.sig || null
}

/**
 * Token cache functions using memory (in production, use Redis or similar)
 */
let tokenCache: TokenCache | null = null

function getTokenFromCache(): TokenCache | null {
  return tokenCache
}

function saveTokenToCache(sig: string): void {
  tokenCache = {
    sig,
    ts: Math.floor(Date.now() / 1000),
  }
}

/**
 * Catalog cache
 */
let catalogCache: CatalogCache | null = null

function getCatalogFromCache(): CatalogCache | null {
  if (!catalogCache) return null
  if (Date.now() / 1000 - catalogCache.ts > CATALOG_TTL) return null
  return catalogCache
}

function saveCatalogToCache(channels: DeltaChannel[]): void {
  catalogCache = {
    channels,
    ts: Math.floor(Date.now() / 1000),
  }
}

/**
 * Extract quality and clean name from channel name - EXACT PHP implementation
 */
function extractMeta(name: string): { quality: string; cleanName: string } {
  let quality = ""

  if (/\b(4K|UHD|2160p)\b/i.test(name)) quality = "4K"
  else if (/\b(FHD|1080[pi]|Full.?HD)\b/i.test(name)) quality = "FHD"
  else if (/\bHD\b/i.test(name)) quality = "HD"
  else if (/\bSD\b/i.test(name)) quality = "SD"

  // Remove suffix tags like .hd, .fhd, etc
  const cleanName = name.replace(/\s+\.[a-zA-Z0-9+]+\s*$/, "").trim()

  return { quality, cleanName }
}

/**
 * Fetch catalog with pagination - EXACT PHP implementation
 */
export async function fetchCatalog(sig: string, force = false): Promise<DeltaChannel[]> {
  if (!force) {
    const cached = getCatalogFromCache()
    if (cached) {
      console.log("[v0] Delta: Using cached catalog,", cached.channels.length, "channels")
      return cached.channels
    }
  }

  const headers = {
    "mediahubmx-signature": sig,
    "Accept-Language": "en",
    "Accept-Encoding": "gzip, deflate",
  }

  // Separators for parsing groups
  const seps = ["➾", "⟾", "->", "→", "»", "›"]

  // Genre mapping from suffix codes - EXACT PHP mapping
  const suffixMap: Record<string, string> = {
    c: "Câble",
    s: "Satellite",
    b: "Basic",
    "b+": "Basic+",
    a: "Adulte",
    hd: "HD",
    fhd: "Full HD",
    "4k": "4K",
    vod: "VOD",
    r: "Radio",
    d: "Documentaire",
    f: "Films",
    sp: "Sport",
    n: "News",
    e: "Enfants",
    m: "Musique",
    g: "Généraliste",
    i: "Info",
    "c+": "Canal+",
    pp: "Pay Per View",
  }

  const all: DeltaChannel[] = []
  let cursor: string | null = null
  let page = 1

  while (true) {
    const payload = {
      language: "en",
      region: "US",
      catalogId: "iptv",
      id: "iptv",
      adult: false,
      search: "",
      sort: "",
      filter: {},
      cursor,
      clientVersion: "3.0.2",
    }

    console.log("[v0] Delta: Fetching catalog page", page)

    let data = null
    for (let retry = 0; retry < 3; retry++) {
      data = await httpPost(CATALOG_URL, payload, headers, 30000)
      if (data) break
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retry) * 1000))
    }

    if (!data) break

    const items = data.items || []
    if (!items.length) break

    for (const item of items) {
      if (item.type !== "iptv") continue

      const group = item.group || ""
      let country = group

      // Extract country from group
      for (const sep of seps) {
        if (country.includes(sep)) {
          country = country.split(sep)[0].trim()
          break
        }
      }
      if (!country) country = "default"

      // Extract genre from group
      let genre = ""
      for (const sep of seps) {
        if (group.includes(sep)) {
          const parts = group.split(sep)
          genre = (parts[1] || "").trim()
          break
        }
      }

      const iname = item.name || ""

      // Try to get genre from suffix if not found
      if (!genre) {
        const match = iname.match(/\s\.([a-zA-Z0-9+]+)$/)
        if (match) {
          const sfx = match[1].toLowerCase()
          genre = suffixMap[sfx] || match[1].toUpperCase()
        }
      }

      const meta = extractMeta(iname)

      all.push({
        country,
        id: item.ids?.id || "",
        name: iname,
        cleanName: meta.cleanName,
        url: item.url || "",
        logo: item.logo || "",
        group,
        genre,
        quality: meta.quality,
      })
    }

    cursor = data.nextCursor || null
    if (!cursor) break

    page++
    if (page % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  console.log("[v0] Delta: Fetched", all.length, "channels")

  if (all.length > 0) {
    saveCatalogToCache(all)
  }

  return all
}

/**
 * Resolve channel URL to stream URL - EXACT PHP implementation
 */
export async function resolveChannel(channelUrl: string, sig: string, maxRetries = 3): Promise<string | null> {
  const headers = {
    "mediahubmx-signature": sig,
    "Accept-Language": "en",
  }

  for (let i = 0; i < maxRetries; i++) {
    // Refresh signature on retry
    if (i > 0) {
      const newSig = await getAddonSig(true)
      if (newSig) {
        headers["mediahubmx-signature"] = newSig
      }
    }

    const result = await httpPost(
      RESOLVE_URL,
      {
        language: "en",
        region: "US",
        url: channelUrl,
        clientVersion: "3.0.2",
      },
      headers,
      15000
    )

    if (result && result[0]?.url) {
      console.log("[v0] Delta: Resolved stream URL")
      return result[0].url
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }

  return null
}

/**
 * Helper functions
 */
export function getCountries(channels: DeltaChannel[]): string[] {
  const countries = new Set<string>()
  for (const ch of channels) {
    if (ch.country && ch.country !== "default") {
      countries.add(ch.country)
    }
  }
  return Array.from(countries).sort()
}

export function getChannelsByCountry(channels: DeltaChannel[], country: string): DeltaChannel[] {
  return channels.filter((ch) => ch.country.toLowerCase() === country.toLowerCase())
}

export function getChannelById(channels: DeltaChannel[], id: string): DeltaChannel | null {
  return channels.find((ch) => ch.id === id) || null
}
