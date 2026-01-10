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

  // This signature would normally be generated dynamically
  // For now using a static approach similar to the Kodi addon
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

        // Check if data.items exists and is an array
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

  async getAllChannels(): Promise<Record<string, string[]>> {
    try {
      const groups = await this.getGroups()
      const allChannels: Record<string, string[]> = {}

      console.log(`[v0] Fetching channels from ${groups.length} groups...`)

      // Fetch channels from all groups in parallel
      const channelsByGroup = await Promise.all(groups.map((group) => this.getChannelsByGroup(group)))

      // Organize by channel name
      for (const channels of channelsByGroup) {
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
      }

      console.log(`[v0] Loaded ${Object.keys(allChannels).length} unique channels`)

      return allChannels
    } catch (error) {
      console.error("[v0] Error in getAllChannels:", error)
      return {}
    }
  }

  private filterChannelName(name: string): string {
    // Basic filtering - remove special characters and normalize
    let filtered = name.toUpperCase().trim()

    // Remove HD indicators, country codes, etc.
    filtered = filtered
      .replace(/\bHD\+?\b/g, "")
      .replace(/\b(FHD|UHD|4K|2K|1080p|720p)\b/g, "")
      .replace(/\b(DE|AT|CH)\b/g, "")
      .replace(/[:|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Skip channels with special markers
    if (filtered.includes("***") || filtered.includes("###") || filtered.includes("---")) {
      return ""
    }

    return filtered
  }

  async resolveVavooStream(url: string): Promise<{ streamUrl: string; headers?: string } | null> {
    console.log("[v0] Attempting to resolve VAVOO stream:", url)

    // Method 1: Try MediaHubMX resolve API (preferred method from Kodi addon)
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

      const response = await fetch("https://vavoo.to/mediahubmx-resolve.json", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })

      const data = await response.json()
      const streamUrl = data[0]?.url

      if (streamUrl) {
        // Verify stream is accessible
        const statusResponse = await fetch(streamUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        })

        if (statusResponse.ok) {
          console.log("[v0] MediaHubMX resolve successful")
          return { streamUrl }
        }
      }
    } catch (error) {
      console.log("[v0] MediaHubMX resolve failed, trying fallback method")
    }

    // Method 2: Direct VAVOO stream (fallback from Kodi addon)
    try {
      // Transform URL: vavoo-iptv -> live2, remove last 12 chars, add .ts?n=1&b=5
      const tsUrl = url.replace("vavoo-iptv", "live2").slice(0, -12) + ".ts?n=1&b=5"

      const statusResponse = await fetch(tsUrl, {
        method: "HEAD",
        headers: { "User-Agent": "VAVOO/2.6" },
        signal: AbortSignal.timeout(10000),
      })

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
