/**
 * Delta Client - Implementation based on VAVOO PHP technique
 * This is the exact implementation from the PHP file for Delta version
 */

import { createClient } from "@/lib/supabase/server"

const CACHE_TTL = {
  TOKEN: 480, // 8 minutes
  CATALOG: 3600, // 1 hour
}

const URLS = {
  PING: ["https://www.lokke.app/api/app/ping", "https://www.vavoo.tv/api/app/ping"],
  CATALOG: "https://vavoo.to/mediahubmx-catalog.json",
  RESOLVE: "https://vavoo.to/mediahubmx-resolve.json",
}

export interface DeltaChannel {
  id: string
  name: string
  cleanName: string
  country: string
  group: string
  genre: string
  quality: string
  url: string
  logo: string
}

interface TokenCache {
  sig: string
  ts: number
}

interface CatalogCache {
  channels: DeltaChannel[]
  ts: number
  count: number
}

export class DeltaClient {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor() {
    this.supabase = null as any
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * HTTP POST request (same as PHP httpPost)
   */
  private async httpPost(url: string, payload: any, headers: Record<string, string> = {}, timeout = 20000) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "User-Agent": "MediaHubMX/2",
          Accept: "*/*",
          Connection: "close",
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error("[v0] Delta httpPost failed:", response.status)
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("[v0] Delta httpPost error:", error)
      return null
    }
  }

  /**
   * Load token from cache (Supabase)
   */
  private async loadTokenCache(): Promise<TokenCache | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("delta_cache")
        .select("sig, ts")
        .eq("type", "token")
        .order("ts", { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return {
        sig: data.sig,
        ts: data.ts,
      }
    } catch {
      return null
    }
  }

  /**
   * Save token to cache
   */
  private async saveTokenCache(sig: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      await supabase.from("delta_cache").upsert(
        {
          type: "token",
          sig,
          ts: Math.floor(Date.now() / 1000),
        },
        { onConflict: "type" }
      )
    } catch (error) {
      console.error("[v0] Delta save token error:", error)
    }
  }

  /**
   * Get addon signature (same as PHP getAddonSig)
   */
  async getAddonSig(force = false): Promise<string | null> {
    // Check cache first
    if (!force) {
      const cached = await this.loadTokenCache()
      if (cached && Date.now() / 1000 - cached.ts < CACHE_TTL.TOKEN) {
        return cached.sig
      }
    }

    // Generate unique device ID
    const uid = `${Math.random().toString(16).slice(2, 6)}${Math.random().toString(16).slice(2, 6)}-${Math.random().toString(16).slice(2, 6)}-${Math.random().toString(16).slice(2, 6)}-${Math.random().toString(16).slice(2, 6)}-${Math.random().toString(16).slice(2, 14)}`

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
    for (const url of URLS.PING) {
      const data = await this.httpPost(url, payload, {}, 15000)
      if (data && data.addonSig) {
        await this.saveTokenCache(data.addonSig)
        return data.addonSig
      }
    }

    // Return old cached sig if available
    const cached = await this.loadTokenCache()
    return cached?.sig || null
  }

  /**
   * Load catalog from cache
   */
  private async loadCatalogCache(): Promise<CatalogCache | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("delta_cache")
        .select("channels, ts")
        .eq("type", "catalog")
        .order("ts", { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      // Check if cache is still valid
      if (Date.now() / 1000 - data.ts > CACHE_TTL.CATALOG) {
        return null
      }

      return {
        channels: data.channels as DeltaChannel[],
        ts: data.ts,
        count: (data.channels as any[]).length,
      }
    } catch {
      return null
    }
  }

  /**
   * Save catalog to cache
   */
  private async saveCatalogCache(channels: DeltaChannel[]): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      await supabase.from("delta_cache").upsert(
        {
          type: "catalog",
          channels,
          ts: Math.floor(Date.now() / 1000),
        },
        { onConflict: "type" }
      )
    } catch (error) {
      console.error("[v0] Delta save catalog error:", error)
    }
  }

  /**
   * Extract quality and clean name from channel name
   */
  private extractMeta(name: string): { quality: string; cleanName: string } {
    let quality = ""

    if (/\b(4K|UHD|2160p)\b/i.test(name)) {
      quality = "4K"
    } else if (/\b(FHD|1080[pi]|Full.?HD)\b/i.test(name)) {
      quality = "FHD"
    } else if (/\bHD\b/i.test(name)) {
      quality = "HD"
    } else if (/\bSD\b/i.test(name)) {
      quality = "SD"
    }

    // Clean name (remove suffix tags)
    const cleanName = name.replace(/\s+\.[a-zA-Z0-9+]+\s*$/, "").trim()

    return { quality, cleanName }
  }

  /**
   * Fetch full catalog with pagination (same as PHP)
   */
  async fetchCatalog(sig: string, force = false): Promise<DeltaChannel[]> {
    // Check cache
    if (!force) {
      const cached = await this.loadCatalogCache()
      if (cached) {
        console.log("[v0] Delta catalog loaded from cache:", cached.count, "channels")
        return cached.channels
      }
    }

    const headers = {
      "mediahubmx-signature": sig,
      "Accept-Language": "en",
      "Accept-Encoding": "gzip, deflate",
    }

    const separators = ["➾", "⟾", "->", "→", "»", "›"]

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

    const allChannels: DeltaChannel[] = []
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

      let data: any = null
      // Retry up to 3 times
      for (let i = 0; i < 3; i++) {
        data = await this.httpPost(URLS.CATALOG, payload, headers, 30000)
        if (data) break
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
      }

      if (!data) break

      const items = data.items || []
      if (items.length === 0) break

      for (const item of items) {
        if (item.type !== "iptv") continue

        const group = item.group || ""
        let country = group

        // Extract country from group
        for (const sep of separators) {
          if (country.includes(sep)) {
            country = country.split(sep)[0].trim()
            break
          }
        }

        if (!country) country = "default"

        // Extract genre from group
        let genre = ""
        for (const sep of separators) {
          if (group.includes(sep)) {
            const parts = group.split(sep)
            genre = parts[1]?.trim() || ""
            break
          }
        }

        const iname = item.name || ""

        // Try to extract genre from suffix
        if (!genre) {
          const match = iname.match(/\s\.([a-zA-Z0-9+]+)$/)
          if (match) {
            const sfx = match[1].toLowerCase()
            genre = suffixMap[sfx] || match[1].toUpperCase()
          }
        }

        const meta = this.extractMeta(iname)

        allChannels.push({
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
      // Sleep every 5 pages to avoid rate limiting
      if (page % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log("[v0] Delta fetched", allChannels.length, "channels")

    if (allChannels.length > 0) {
      await this.saveCatalogCache(allChannels)
    }

    return allChannels
  }

  /**
   * Get all countries from catalog
   */
  getCountries(channels: DeltaChannel[]): string[] {
    const countries = new Set<string>()
    for (const ch of channels) {
      if (ch.country && ch.country !== "default") {
        countries.add(ch.country)
      }
    }
    return Array.from(countries).sort()
  }

  /**
   * Get channels by country
   */
  getChannelsByCountry(channels: DeltaChannel[], country: string): DeltaChannel[] {
    return channels.filter((ch) => ch.country.toLowerCase() === country.toLowerCase())
  }

  /**
   * Get channel by ID
   */
  getChannelById(channels: DeltaChannel[], id: string): DeltaChannel | null {
    return channels.find((ch) => ch.id === id) || null
  }

  /**
   * Resolve channel URL to stream (same as PHP resolveChannel)
   */
  async resolveChannel(channelUrl: string, sig: string, maxRetries = 3): Promise<string | null> {
    const headers = {
      "mediahubmx-signature": sig,
      "Accept-Language": "en",
    }

    for (let i = 0; i < maxRetries; i++) {
      // Refresh sig on retry
      if (i > 0) {
        const newSig = await this.getAddonSig(true)
        if (newSig) {
          sig = newSig
          headers["mediahubmx-signature"] = sig
        }
      }

      const data = await this.httpPost(
        URLS.RESOLVE,
        {
          language: "en",
          region: "US",
          url: channelUrl,
          clientVersion: "3.0.2",
        },
        headers,
        15000
      )

      if (data && data[0]?.url) {
        return data[0].url
      }

      // Wait before retry
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }

    return null
  }

  /**
   * Resolve stream for a channel (combines getChannelById + resolveChannel)
   */
  async resolveStream(channelId: string): Promise<{ url: string; channel: DeltaChannel } | null> {
    // Get signature
    const sig = await this.getAddonSig()
    if (!sig) {
      console.error("[v0] Delta: Failed to get signature")
      return null
    }

    // Fetch catalog
    const allChannels = await this.fetchCatalog(sig)
    
    // Find the channel by ID
    const channel = this.getChannelById(allChannels, channelId)
    if (!channel) {
      console.error("[v0] Delta: Channel not found:", channelId)
      return null
    }

    // Resolve the channel URL to stream URL
    const streamUrl = await this.resolveChannel(channel.url, sig)
    if (!streamUrl) {
      console.error("[v0] Delta: Failed to resolve stream for:", channelId)
      return null
    }

    return { url: streamUrl, channel }
  }
}
