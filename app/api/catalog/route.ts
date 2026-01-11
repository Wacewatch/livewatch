import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const channelCache = new Map<string, any>()

function isGenericPlaceholder(url: string | undefined) {
  if (!url) return true
  return url.includes("qwertyuiop8899") || url.includes("tvvoo.png") || url.includes("placeholder")
}

async function fetchFromExternalAPI() {
  try {
    console.log("[v0] Fetching channels from external API...")
    const apiUrl =
      "https://morning-wildflower-3cf3.wavewatchcontact.workers.dev/https://apis.wavewatch.xyz/api.php?action=catalog&type=tv&id=vavoo_tv_fr"

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const text = await response.text()
    const data = JSON.parse(text)

    if (!data.metas || !Array.isArray(data.metas)) {
      throw new Error("Invalid API response structure")
    }

    console.log("[v0] Fetching detailed sources for channels...")
    const channelsWithDetails = await Promise.all(
      data.metas
        .filter((meta: any) => meta.type === "tv")
        .slice(0, 100) // Limit to 100 to avoid rate limiting
        .map(async (meta: any) => {
          const details = await fetchChannelDetails(meta.id)

          const sources = details?.sources || [
            {
              id: meta.id,
              name: meta.name,
              quality: "SD",
              url: meta.id,
            },
          ]

          return {
            id: meta.id,
            baseId: meta.id,
            name: meta.name,
            baseName: meta.name,
            poster: isGenericPlaceholder(details?.poster || meta.poster) ? null : details?.poster || meta.poster,
            logo: isGenericPlaceholder(details?.logo || meta.logo) ? null : details?.logo || meta.logo,
            background: isGenericPlaceholder(details?.background || meta.background)
              ? null
              : details?.background || meta.background,
            posterShape: meta.posterShape || "landscape",
            category: details?.category || meta.category || "Divers",
            genres: meta.genres || [],
            type: meta.type,
            language: meta.language || "FR",
            sources: sources.map((src: any, idx: number) => ({
              id: meta.id,
              name: src.name || meta.name,
              quality: src.quality || "SD",
              url: meta.id,
              priority: src.priority || idx + 1,
            })),
          }
        }),
    )

    const remainingChannels = data.metas
      .filter((meta: any) => meta.type === "tv")
      .slice(100)
      .map((meta: any) => ({
        id: meta.id,
        baseId: meta.id,
        name: meta.name,
        baseName: meta.name,
        poster: isGenericPlaceholder(meta.poster) ? null : meta.poster,
        logo: isGenericPlaceholder(meta.logo) ? null : meta.logo,
        background: isGenericPlaceholder(meta.background) ? null : meta.background,
        posterShape: meta.posterShape || "landscape",
        category: meta.category || "Divers",
        genres: meta.genres || [],
        type: meta.type,
        language: meta.language || "FR",
        sources: [
          {
            id: meta.id,
            name: meta.name,
            quality: "SD",
            url: meta.id,
          },
        ],
      }))

    const allChannels = [...channelsWithDetails, ...remainingChannels]

    console.log(`[v0] Successfully loaded ${allChannels.length} channels from external API`)
    return allChannels
  } catch (error) {
    console.error("[v0] External API error:", error)
    return []
  }
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
    console.log("[v0] Fetching channels from database cache...")

    const supabase = await createClient()

    const { data: channels, error } = await supabase.from("catalog_cache").select("*").eq("enabled", true).order("name")

    if (error) {
      // If table doesn't exist (PGRST205), use external API
      if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
        console.log("[v0] Cache table not found, using external API...")
        const externalChannels = await fetchFromExternalAPI()
        return NextResponse.json(
          { channels: externalChannels },
          {
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
          },
        )
      }

      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "Database error", channels: [] }, { status: 500 })
    }

    if (!channels || channels.length === 0) {
      console.log("[v0] Cache is empty, using external API...")
      const externalChannels = await fetchFromExternalAPI()
      return NextResponse.json(
        { channels: externalChannels },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        },
      )
    }

    // Transform database format to expected format
    const formattedChannels = channels.map((ch: any) => ({
      id: ch.id,
      baseId: ch.id,
      name: ch.name,
      baseName: ch.name,
      poster: ch.background,
      logo: ch.logo,
      background: ch.background,
      posterShape: "landscape",
      category: ch.category || "Divers",
      genres: ch.category ? [ch.category] : [],
      type: "tv",
      language: ch.language || "FR",
      sources: JSON.parse(ch.sources || "[]"),
    }))

    console.log(`[v0] Successfully loaded ${formattedChannels.length} channels from cache`)

    return NextResponse.json(
      { channels: formattedChannels },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Catalog API error:", error)
    return NextResponse.json({ error: "Unable to fetch catalog", channels: [] }, { status: 500 })
  }
}
