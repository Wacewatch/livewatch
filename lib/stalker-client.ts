export interface StalkerConfig {
  portalUrl: string
  mac: string
}

export interface StalkerToken {
  value: string
  timestamp: number
  mac: string
  portalUrl: string
}

export class StalkerPortalClient {
  private token: StalkerToken | null = null
  private readonly TOKEN_EXPIRY = 120 * 1000 // 120 seconds

  constructor(private config: StalkerConfig) {}

  private generateHeaders(includeAuth = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "*/*",
      "User-Agent":
        "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 1812 Mobile Safari/533.3",
      Referer: this.config.portalUrl,
      "Accept-Language": "en-US,en;q=0.5",
      Pragma: "no-cache",
      "X-User-Agent": "Model: MAG250; Link: WiFi",
    }

    if (includeAuth && this.token?.value) {
      headers.Authorization = `Bearer ${this.token.value}`
    }

    headers.Cookie = this.generateCookies()
    headers.Connection = "Close"
    headers["Accept-Encoding"] = "gzip, deflate"

    return headers
  }

  private generateCookies(): string {
    const cookies: Record<string, string> = {
      mac: encodeURIComponent(this.config.mac),
      stb_lang: "en",
      timezone: encodeURIComponent("Europe/Paris"),
    }

    if (this.token?.value) {
      cookies.token = encodeURIComponent(this.token.value)
    }

    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ")
  }

  private getBaseUrl(): string {
    return this.config.portalUrl.replace("/c", "/server/load.php")
  }

  private async makeRequest(params: Record<string, string>, includeAuth = true): Promise<any> {
    const url = new URL(this.getBaseUrl())
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
    url.searchParams.append("JsHttpRequest", "1-xml")

    const headers = this.generateHeaders(includeAuth)

    const response = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (response.status === 403) {
      throw new Error("IP_BLOCKED")
    }

    const text = await response.text()

    if (text.includes("IP adresiniz engellenmistir")) {
      throw new Error("IP_BLOCKED")
    }

    const data = JSON.parse(text)
    return data.js
  }

  private async handshake(): Promise<string | null> {
    try {
      const params = {
        type: "stb",
        action: "handshake",
      }

      const response = await this.makeRequest(params, false)
      const token = response?.token

      if (token) {
        this.token = {
          value: token,
          timestamp: Date.now(),
          mac: this.config.mac,
          portalUrl: this.config.portalUrl,
        }
        console.log("[v0] Stalker handshake successful, token obtained")
        return token
      }

      return null
    } catch (error) {
      console.error("[v0] Stalker handshake error:", error)
      throw error
    }
  }

  private async getProfile(): Promise<void> {
    const params = {
      type: "stb",
      action: "get_profile",
      hd: "1",
      ver: "ImageDescription: 0.2.18-r23-250; ImageDate: Thu Sep 13 11:31:16 EEST 2018; PORTAL version: 5.6.2; API Version: JS API version: 343; STB API version: 146; Player Engine version: 0x58c",
      num_banks: "2",
      stb_type: "MAG250",
      client_type: "STB",
      image_version: "218",
      video_out: "hdmi",
      auth_second_step: "1",
      hw_version: "1.7-BD-00",
      not_valid_token: "0",
      hw_version_2: await this.sha1(this.config.mac),
      timestamp: Math.floor(Date.now() / 1000).toString(),
      api_signature: "262",
      prehash: "",
    }

    try {
      const response = await this.makeRequest(params)
      const token = response?.token

      if (token) {
        this.token = {
          value: token,
          timestamp: Date.now(),
          mac: this.config.mac,
          portalUrl: this.config.portalUrl,
        }
        console.log("[v0] Stalker profile token updated")
      }
    } catch (error) {
      console.error("[v0] Stalker get_profile error:", error)
      throw error
    }
  }

  private async sha1(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  private isTokenValid(): boolean {
    if (!this.token) return false
    if (this.token.mac !== this.config.mac) return false
    if (this.token.portalUrl !== this.config.portalUrl) return false
    if (Date.now() - this.token.timestamp > this.TOKEN_EXPIRY) return false
    return true
  }

  private async ensureToken(): Promise<void> {
    if (this.isTokenValid()) {
      console.log("[v0] Existing Stalker token is still valid")
      return
    }

    if (!this.token?.value) {
      console.log("[v0] No Stalker token present, performing handshake")
      await this.handshake()
      await this.getProfile()
    } else {
      console.log("[v0] Stalker token expired, refreshing")
      await this.getProfile()
    }
  }

  async getStreamUrl(cmd: string): Promise<{ url: string; headers: Record<string, string> } | null> {
    try {
      await this.ensureToken()

      const params = {
        type: "itv",
        action: "create_link",
        cmd: cmd,
      }

      const response = await this.makeRequest(params)

      if (response?.cmd) {
        const cmdParts = response.cmd.split(" ")
        const streamUrl = cmdParts[cmdParts.length - 1]

        console.log("[v0] Stalker stream URL obtained:", streamUrl.substring(0, 100))

        return {
          url: streamUrl,
          headers: this.generateHeaders(true),
        }
      }

      return null
    } catch (error) {
      console.error("[v0] Stalker getStreamUrl error:", error)
      throw error
    }
  }

  async getChannels(): Promise<any[]> {
    try {
      await this.ensureToken()

      const params = {
        type: "itv",
        action: "get_all_channels",
      }

      const response = await this.makeRequest(params)

      if (response?.data) {
        return response.data.map((channel: any) => ({
          name: channel.name,
          cmd: channel.cmd,
          use_http_tmp_link: channel.use_http_tmp_link,
          tv_genre_id: channel.tv_genre_id,
        }))
      }

      return []
    } catch (error) {
      console.error("[v0] Stalker getChannels error:", error)
      throw error
    }
  }

  async getGenres(): Promise<Record<string, string>> {
    try {
      await this.ensureToken()

      const params = {
        type: "itv",
        action: "get_genres",
      }

      const response = await this.makeRequest(params)

      const genres: Record<string, string> = {}

      if (Array.isArray(response)) {
        for (const genre of response) {
          if (genre.title && genre.id && genre.id !== "*") {
            genres[genre.title] = genre.id
          }
        }
      }

      return Object.fromEntries(Object.entries(genres).sort())
    } catch (error) {
      console.error("[v0] Stalker getGenres error:", error)
      throw error
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.ensureToken()
      const channels = await this.getChannels()
      return channels.length > 0
    } catch (error) {
      console.error("[v0] Stalker health check failed:", error)
      return false
    }
  }
}
