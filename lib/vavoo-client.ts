export interface VavooChannel {
  url: string
  name: string
  group: string
}

interface VavooResponse {
  items: Array<{
    url: string
    name: string
    group: string
  }>
  nextCursor?: number | null
}

export class VavooClient {
  private baseUrl = "https://vavoo.to"
  private requestDelay = 300 // ms between requests

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private getAuthSignature(): string {
    // In production, this would call the signature generation endpoint
    // For simplicity, we'll use a basic implementation
    return "static-signature"
  }

  async getGroups(): Promise<string[]> {
    try {
      const response = await fetch("https://www2.vavoo.to/live2/index?output=json")
      const channels = await response.json()

      const groups = new Set<string>()
      for (const channel of channels) {
        if (channel.group) {
          groups.add(channel.group)
        }
      }

      return Array.from(groups).sort()
    } catch (error) {
      console.error("[v0] Error fetching VAVOO groups:", error)
      return []
    }
  }

  async getChannelsByGroup(group: string): Promise<VavooChannel[]> {
    const headers = {
      "user-agent": "okhttp/4.11.0",
      accept: "application/json",
      "content-type": "application/json; charset=utf-8",
      "accept-encoding": "gzip",
    }

    const items: VavooChannel[] = []
    let cursor: number | null = 0

    while (cursor !== null) {
      const body = {
        language: "de",
        region: "AT",
        catalogId: "iptv",
        id: "iptv",
        adult: false,
        search: "",
        sort: "name",
        filter: { group },
        cursor,
        clientVersion: "3.0.2",
      }

      try {
        if (cursor > 0) {
          await this.sleep(this.requestDelay)
        }

        const response = await fetch(`${this.baseUrl}/mediahubmx-catalog.json`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!data) {
          console.log(`[v0] Empty response for group: ${group}`)
          break
        }

        if (!data.items || !Array.isArray(data.items)) {
          console.log(`[v0] No items array in response for group: ${group}`, data)
          break
        }

        if (data.items.length === 0) {
          console.log(`[v0] No more items for group: ${group}`)
          break
        }

        for (const item of data.items) {
          if (item && item.url && item.name) {
            items.push({
              url: item.url,
              name: item.name,
              group: item.group || group,
            })
          }
        }

        cursor = data.nextCursor || null
      } catch (error) {
        console.error("[v0] Error fetching VAVOO channels for group:", group, error)
        break
      }
    }

    return items
  }

  async getChannelsByGroups(groups: string[]): Promise<Record<string, string[]>> {
    try {
      const allChannels: Record<string, string[]> = {}

      console.log(`[v0] Fetching channels from ${groups.length} selected groups...`)

      for (const group of groups) {
        const channels = await this.getChannelsByGroup(group)

        for (const channel of channels) {
          const normalizedName = this.filterChannelName(channel.name)
          if (!normalizedName) continue

          if (!allChannels[normalizedName]) {
            allChannels[normalizedName] = []
          }

          if (!allChannels[normalizedName].includes(channel.url)) {
            allChannels[normalizedName].push(channel.url)
          }
        }

        await this.sleep(this.requestDelay)
      }

      console.log(`[v0] Loaded ${Object.keys(allChannels).length} unique channels`)

      return allChannels
    } catch (error) {
      console.error("[v0] Error in getChannelsByGroups:", error)
      return {}
    }
  }

  async getAllChannels(): Promise<Record<string, string[]>> {
    try {
      const groups = await this.getGroups()

      const popularGroups = groups.filter((g) =>
        ["France", "Germany", "United Kingdom", "Spain", "Italy", "Turkey"].some((country) => g.includes(country)),
      )

      const selectedGroups = popularGroups.length > 0 ? popularGroups.slice(0, 15) : groups.slice(0, 15)

      return this.getChannelsByGroups(selectedGroups)
    } catch (error) {
      console.error("[v0] Error in getAllChannels:", error)
      return {}
    }
  }

  private filterChannelName(name: string): string {
    let filtered = name.toUpperCase().trim()

    filtered = filtered
      .replace(/\bHD\+?\b/g, "")
      .replace(/\b(FHD|UHD|4K|2K|1080p|720p)\b/g, "")
      .replace(/\b(DE|AT|CH)\b/g, "")
      .replace(/[:|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (filtered.includes("***") || filtered.includes("###") || filtered.includes("---")) {
      return ""
    }

    return filtered
  }

  async resolveVavooStream(url: string): Promise<{ streamUrl: string; headers?: string } | null> {
    console.log("[v0] Attempting to resolve VAVOO stream:", url)

    try {
      const headers = {
        "user-agent": "MediaHubMX/2",
        accept: "application/json",
        "content-type": "application/json; charset=utf-8",
        "accept-encoding": "gzip",
      }

      const body = {
        language: "de",
        region: "AT",
        url,
        clientVersion: "3.0.2",
      }

      const fetchWithTimeout = (url: string, options: RequestInit, timeout: number) => {
        return Promise.race([
          fetch(url, options),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
        ])
      }

      const response = await fetchWithTimeout(
        "https://vavoo.to/mediahubmx-resolve.json",
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
        10000,
      )

      const data = await response.json()
      const streamUrl = data[0]?.url

      if (streamUrl) {
        try {
          const statusResponse = await fetchWithTimeout(streamUrl, { method: "HEAD" }, 10000)

          if (statusResponse.ok) {
            console.log("[v0] MediaHubMX resolve successful")
            return { streamUrl }
          }
        } catch (error) {
          throw error
        }
      }
    } catch (error) {
      console.log("[v0] MediaHubMX resolve failed, trying fallback method")
    }

    try {
      const tsUrl = url.replace("vavoo-iptv", "live2").slice(0, -12) + ".ts?n=1&b=5"

      const fetchWithTimeout = (url: string, options: RequestInit, timeout: number) => {
        return Promise.race([
          fetch(url, options),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
        ])
      }

      const statusResponse = await fetchWithTimeout(
        tsUrl,
        {
          method: "HEAD",
          headers: { "User-Agent": "VAVOO/2.6" },
        },
        10000,
      )

      if (statusResponse.ok) {
        console.log("[v0] Direct VAVOO stream successful")
        return {
          streamUrl: tsUrl,
          headers: "User-Agent=VAVOO/2.6",
        }
      }
    } catch (error) {
      console.error("[v0] Direct VAVOO stream failed:", error)
    }

    console.log("[v0] All stream resolution methods failed")
    return null
  }
}
