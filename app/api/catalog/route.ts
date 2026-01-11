import { NextResponse } from "next/server"

const channelCache = new Map<string, any>()

function isGenericPlaceholder(url: string | undefined) {
  if (!url) return true
  return url.includes("qwertyuiop8899") || url.includes("tvvoo.png") || url.includes("placeholder")
}

async function fetchChannelDetails(channelId: string) {
  // Check cache first
  if (channelCache.has(channelId)) {
    return channelCache.get(channelId)
  }

  try {
    const apiUrl = `https://morning-wildflower-3cf3.wavewatchcontact.workers.dev/https://nakios.site/api/tv-live/channel/${channelId}`

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.success && data.data) {
      channelCache.set(channelId, data.data)
      return data.data
    }
  } catch (error) {
    console.error(`[v0] Failed to fetch details for ${channelId}:`, error)
  }

  return null
}

export async function GET() {
  try {
    console.log("[v0] Fetching channels from catalog API...")

    const catalogUrl = "https://apis.wavewatch.xyz/api.php?action=catalog&type=tv&id=vavoo_tv_fr"

    const response = await fetch(catalogUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const text = await response.text()
    const data = JSON.parse(text)

    const channels: any[] = []

    // Fetch first 100 channels with details to avoid overwhelming the API
    const channelsToFetch = (data.metas || []).slice(0, 100)

    console.log(`[v0] Fetching details for ${channelsToFetch.length} channels...`)

    for (const meta of channelsToFetch) {
      const groupMatch = meta.id?.match(/group:(\w+)/)
      const language = groupMatch ? groupMatch[1].toUpperCase() : "FR"

      // Fetch detailed channel data with sources
      const channelDetails = await fetchChannelDetails(meta.id)

      const sources = channelDetails?.sources || [
        {
          id: meta.id,
          name: meta.name,
          quality: meta.name?.toUpperCase().includes("FHD")
            ? "FHD"
            : meta.name?.toUpperCase().includes("HD")
              ? "HD"
              : "SD",
          url: null,
        },
      ]

      const logo = channelDetails?.logo || meta.logo
      const poster = channelDetails?.poster || meta.poster
      const background = channelDetails?.background || meta.background

      channels.push({
        id: meta.id,
        name: channelDetails?.name || meta.name,
        poster: isGenericPlaceholder(poster) ? null : poster,
        logo: isGenericPlaceholder(logo) ? null : logo,
        background: isGenericPlaceholder(background) ? null : background,
        posterShape: meta.posterShape || "landscape",
        category: channelDetails?.category || meta.genres?.[0] || "Divers",
        genres: meta.genres || [],
        type: meta.type || "tv",
        language,
        sources: sources.map((src: any) => ({
          id: src.id || meta.id,
          name: src.name || meta.name,
          quality: src.quality || "SD",
          priority: src.priority || 1,
        })),
      })
    }

    console.log(`[v0] Successfully loaded ${channels.length} channels with sources`)

    return NextResponse.json({ channels })
  } catch (error) {
    console.error("[v0] Catalog API error:", error)
    return NextResponse.json({ error: "Unable to fetch catalog", channels: [] }, { status: 500 })
  }
}
