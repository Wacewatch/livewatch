/**
 * NAGA STREAM CLIENT – TypeScript Edition
 * Based on VAVOO STREAM LIVE PHP technique
 * Exact replication of reading technique from PHP code
 */

interface NagaChannel {
  id: string
  name: string
  url: string
  logo: string
  group: string
  country: string
}

interface NagaTokenCache {
  sig: string
  ts: number
}

interface NagaPingPayload {
  reason: string
  locale: string
  theme: string
  metadata: {
    device: {
      type: string
      uniqueId: string
    }
    os: {
      name: string
      version: string
      abis: string[]
      host: string
    }
    app: {
      platform: string
    }
    version: {
      package: string
      binary: string
      js: string
    }
  }
  appFocusTime: number
  playerActive: boolean
  playDuration: number
  devMode: boolean
  hasAddon: boolean
  castConnected: boolean
  package: string
  version: string
  process: string
  firstAppStart: number
  lastAppStart: number
  ipLocation: null
  adblockEnabled: boolean
  proxy: {
    supported: string[]
    engine: string
    enabled: boolean
    autoServer: boolean
  }
  iap: {
    supported: boolean
  }
}

export class NagaClient {
  private static TOKEN_TTL = 480 // 8 minutes (same as PHP)
  private static CATALOG_TTL = 3600 // 1 hour (same as PHP)
  private static PING_URL = "https://www.lokke.app/api/app/ping"
  private static PING_URL2 = "https://www.vavoo.tv/api/app/ping"
  private static CATALOG_URL = "https://vavoo.to/mediahubmx-catalog.json"
  private static RESOLVE_URL = "https://vavoo.to/mediahubmx-resolve.json"

  private tokenCache: NagaTokenCache | null = null
  private catalogCache: { channels: NagaChannel[]; ts: number } | null = null

  /**
   * Generate unique device ID (same as PHP)
   */
  private generateDeviceId(): string {
    const random = () => Math.floor(Math.random() * 0xffff)
    const random12 = () => Math.floor(Math.random() * 0xffffffffffff)

    return `${random().toString(16).padStart(4, "0")}${random().toString(16).padStart(4, "0")}-${random().toString(16).padStart(4, "0")}-${(random() & 0x0fff | 0x4000).toString(16).padStart(4, "0")}-${(random() & 0x3fff | 0x8000).toString(16).padStart(4, "0")}-${random12().toString(16).padStart(12, "0")}`
  }

  /**
   * HTTP POST with exact headers from PHP
   */
  private async httpPost(url: string, payload: any, extraHeaders: Record<string, string> = {}): Promise<any> {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "MediaHubMX/2",
      Accept: "*/*",
      Connection: "close",
      ...extraHeaders,
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("[v0] Naga HTTP POST error:", error)
      return null
    }
  }

  /**
   * Get addon signature (token) - exact replica of PHP getAddonSig()
   */
  async getAddonSig(force = false): Promise<string | null> {
    // Check cache
    if (!force && this.tokenCache) {
      const age = Math.floor(Date.now() / 1000) - this.tokenCache.ts
      if (age < NagaClient.TOKEN_TTL) {
        console.log(`[v0] Naga: Using cached token (age: ${age}s)`)
        return this.tokenCache.sig
      }
    }

    console.log("[v0] Naga: Fetching new token...")

    const uid = this.generateDeviceId()
    const ts = Date.now()

    const payload: NagaPingPayload = {
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
    for (const pingUrl of [NagaClient.PING_URL, NagaClient.PING_URL2]) {
      const data = await this.httpPost(pingUrl, payload)
      if (data && data.addonSig) {
        console.log(`[v0] Naga: Token obtained from ${pingUrl}`)
        this.tokenCache = {
          sig: data.addonSig,
          ts: Math.floor(Date.now() / 1000),
        }
        return data.addonSig
      }
    }

    // Return cached token if available
    if (this.tokenCache) {
      console.log("[v0] Naga: Using old cached token as fallback")
      return this.tokenCache.sig
    }

    console.error("[v0] Naga: Failed to obtain token")
    return null
  }

  /**
   * Fetch catalog with pagination - exact replica of PHP fetchCatalog()
   */
  async fetchCatalog(sig: string, force = false): Promise<NagaChannel[]> {
    // Check cache
    if (!force && this.catalogCache) {
      const age = Math.floor(Date.now() / 1000) - this.catalogCache.ts
      if (age < NagaClient.CATALOG_TTL) {
        console.log(`[v0] Naga: Using cached catalog (${this.catalogCache.channels.length} channels)`)
        return this.catalogCache.channels
      }
    }

    console.log("[v0] Naga: Fetching catalog...")

    const extraHeaders = {
      "mediahubmx-signature": sig,
      "Accept-Language": "en",
      "Accept-Encoding": "gzip, deflate",
    }

    const separators = ["➾", "⟾", "->", "→", "»", "›"]
    const allChannels: NagaChannel[] = []
    let cursor: number | null = null
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

      let data = null
      // Retry logic (same as PHP: 3 attempts with exponential backoff)
      for (let i = 0; i < 3; i++) {
        data = await this.httpPost(NagaClient.CATALOG_URL, payload, extraHeaders)
        if (data) break
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
      }

      if (!data) break

      const items = data.items || []
      if (!items.length) break

      for (const item of items) {
        if (item.type !== "iptv") continue

        let group = item.group || ""
        let country = group

        // Extract country from group (same separator logic as PHP)
        for (const sep of separators) {
          if (country.includes(sep)) {
            country = country.split(sep)[0].trim()
            break
          }
        }

        if (!country) country = "default"

        allChannels.push({
          country,
          id: item.ids?.id || "",
          name: item.name || "",
          url: item.url || "",
          logo: item.logo || "",
          group,
        })
      }

      cursor = data.nextCursor || null
      if (!cursor) break

      page++
      // Rate limiting (same as PHP: sleep every 5 pages)
      if (page % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log(`[v0] Naga: Fetched page ${page}, total channels: ${allChannels.length}`)
    }

    console.log(`[v0] Naga: Catalog complete - ${allChannels.length} channels`)

    // Save to cache
    if (allChannels.length > 0) {
      this.catalogCache = {
        channels: allChannels,
        ts: Math.floor(Date.now() / 1000),
      }
    }

    return allChannels
  }

  /**
   * Resolve channel stream URL - exact replica of PHP resolveChannel()
   */
  async resolveChannel(channelUrl: string, sig: string, maxRetries = 3): Promise<string | null> {
    console.log(`[v0] Naga: Resolving channel ${channelUrl}`)

    const extraHeaders = {
      "mediahubmx-signature": sig,
      "Accept-Language": "en",
    }

    for (let i = 0; i < maxRetries; i++) {
      // Refresh token on retry (same as PHP)
      if (i > 0) {
        console.log(`[v0] Naga: Retry ${i + 1}, refreshing token...`)
        const newSig = await this.getAddonSig(true)
        if (newSig) {
          sig = newSig
          extraHeaders["mediahubmx-signature"] = sig
        }
      }

      const payload = {
        language: "en",
        region: "US",
        url: channelUrl,
        clientVersion: "3.0.2",
      }

      const data = await this.httpPost(NagaClient.RESOLVE_URL, payload, extraHeaders)

      if (data && data[0]?.url) {
        console.log("[v0] Naga: Stream resolved successfully")
        return data[0].url
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }

    console.error("[v0] Naga: Failed to resolve channel after", maxRetries, "attempts")
    return null
  }

  /**
   * Get channels by country
   */
  async getChannelsByCountry(country: string): Promise<NagaChannel[]> {
    const sig = await this.getAddonSig()
    if (!sig) return []

    const allChannels = await this.fetchCatalog(sig)
    return allChannels.filter((ch) => ch.country.toLowerCase() === country.toLowerCase())
  }

  /**
   * Get all countries
   */
  async getCountries(): Promise<string[]> {
    const sig = await this.getAddonSig()
    if (!sig) return []

    const allChannels = await this.fetchCatalog(sig)
    const countries = new Set<string>()

    for (const ch of allChannels) {
      if (ch.country && ch.country !== "default") {
        countries.add(ch.country)
      }
    }

    return Array.from(countries).sort()
  }

  /**
   * Get channel by ID
   */
  async getChannelById(id: string): Promise<NagaChannel | null> {
    const sig = await this.getAddonSig()
    if (!sig) return null

    const allChannels = await this.fetchCatalog(sig)
    return allChannels.find((ch) => ch.id === id) || null
  }

  /**
   * Resolve stream for a channel (combines getChannelById + resolveChannel)
   */
  async resolveStream(channelId: string): Promise<{ url: string; channel: NagaChannel } | null> {
    const sig = await this.getAddonSig()
    if (!sig) return null

    const channel = await this.getChannelById(channelId)
    if (!channel) return null

    const streamUrl = await this.resolveChannel(channel.url, sig)
    if (!streamUrl) return null

    return { url: streamUrl, channel }
  }
}
