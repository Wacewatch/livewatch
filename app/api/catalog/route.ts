import { NextResponse } from "next/server"

const channelMap = new Map<string, string>()
let nextInternalId = 1

function getInternalId(externalId: string): string {
  if (!channelMap.has(externalId)) {
    channelMap.set(externalId, `ch_${nextInternalId++}`)
  }
  return channelMap.get(externalId)!
}

export function getExternalId(internalId: string): string | undefined {
  for (const [external, internal] of channelMap.entries()) {
    if (internal === internalId) return external
  }
  return undefined
}

function getBaseName(name: string): string {
  return name
    .replace(/\s*(HD|FHD|4K|UHD|SD|HEVC|H\.264|H264).*$/i, "") // Remove quality indicators
    .replace(/\s+\d+$/, "") // Remove trailing numbers
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .toUpperCase() // Normalize to uppercase for comparison
    .trim()
}

export async function GET() {
  try {
    console.log("[v0] Fetching channels from catalog API...")

    const apiUrl = "https://apis.wavewatch.xyz/api.php?action=catalog&type=tv&id=vavoo_tv_fr"

    const response = await fetch(apiUrl, {
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

    try {
      const data = JSON.parse(text)

      const isGenericPlaceholder = (url: string | undefined) => {
        if (!url) return true
        return url.includes("qwertyuiop8899") || url.includes("tvvoo.png") || url.includes("placeholder")
      }

      const channelsList =
        data.metas?.map((meta: any) => {
          const groupMatch = meta.id?.match(/group:(\w+)/)
          const language = groupMatch ? groupMatch[1].toUpperCase() : "FR"

          const nameUpper = meta.name?.toUpperCase() || ""
          const has4K = nameUpper.includes("4K") || nameUpper.includes("UHD")
          const hasFHD = nameUpper.includes("FHD")
          const hasHD = nameUpper.includes("HD") && !hasFHD
          const quality = has4K ? "4K" : hasFHD ? "FHD" : hasHD ? "HD" : "SD"

          return {
            id: getInternalId(meta.id),
            externalId: meta.id,
            name: meta.name,
            baseName: getBaseName(meta.name),
            poster: isGenericPlaceholder(meta.poster) ? null : meta.poster,
            logo: isGenericPlaceholder(meta.logo) ? null : meta.logo,
            background: isGenericPlaceholder(meta.background) ? null : meta.background,
            posterShape: meta.posterShape || "landscape",
            category: meta.genres?.[0] || "Divers",
            genres: meta.genres || [],
            type: meta.type || "tv",
            language,
            quality,
            priority: has4K ? 4 : hasFHD ? 3 : hasHD ? 2 : 1,
          }
        }) || []

      const groupedMap = new Map<string, any>()

      for (const channel of channelsList) {
        const key = `${channel.baseName}_${channel.language}`

        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            baseId: channel.id,
            baseName: channel.baseName,
            displayName: channel.name, // Keep original display name
            poster: channel.poster,
            logo: channel.logo,
            background: channel.background,
            posterShape: channel.posterShape,
            category: channel.category,
            genres: channel.genres,
            type: channel.type,
            language: channel.language,
            sources: [],
          })
        }

        const grouped = groupedMap.get(key)

        grouped.sources.push({
          id: channel.id,
          name: channel.name,
          quality: channel.quality,
          priority: channel.priority,
        })

        if (channel.logo && !grouped.logo) grouped.logo = channel.logo
        if (channel.background && !grouped.background) grouped.background = channel.background
        if (channel.poster && !grouped.poster) grouped.poster = channel.poster

        // Update display name to shortest variant (usually the cleanest)
        if (channel.name.length < grouped.displayName.length) {
          grouped.displayName = channel.name
        }
      }

      const channels = Array.from(groupedMap.values()).map((group) => {
        group.sources.sort((a: any, b: any) => b.priority - a.priority)
        return group
      })

      console.log("[v0] Successfully fetched and grouped", channels.length, "channels")
      console.log("[v0] Example grouped channel:", channels[0])

      return NextResponse.json({ channels })
    } catch (parseError) {
      console.error("[v0] JSON parse error:", text.substring(0, 200))
      return NextResponse.json(
        {
          error: "Invalid JSON response",
          message: "Unable to parse catalog data",
          channels: [],
        },
        { status: 503 },
      )
    }
  } catch (error) {
    console.error("[v0] Catalog API error:", error)
    return NextResponse.json(
      {
        error: "Unable to fetch catalog",
        channels: [],
      },
      { status: 500 },
    )
  }
}
