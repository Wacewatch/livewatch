import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const channelCache = new Map<string, any>()

function isGenericPlaceholder(url: string | undefined) {
  if (!url) return true
  return (
    url.includes("qwertyuiop8899") || url.includes("tvvoo.png") || url.includes("tvvoo") || url.includes("placeholder")
  )
}

function extractQuality(name: string): string {
  const qualityMatch = name.match(/\b(FHD|4K|UHD|HD)\b/i)
  if (qualityMatch) {
    return qualityMatch[1].toUpperCase()
  }
  return "SD"
}

function getBaseName(name: string): string {
  return name
    .replace(/\s*(FHD|4K|UHD|HD|SD)\s*/gi, "")
    .replace(/\s*(BACKUP|EVENING|LIVE|EVENTS?|ONLY)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
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

    const channelGroups = new Map<string, any>()

    for (const meta of data.metas.filter((m: any) => m.type === "tv")) {
      const baseName = getBaseName(meta.name)
      const quality = extractQuality(meta.name)
      const groupKey = `${baseName}_${meta.language || "FR"}`

      if (!channelGroups.has(groupKey)) {
        channelGroups.set(groupKey, {
          id: `grouped_${baseName.toLowerCase().replace(/\s+/g, "_")}`,
          baseId: meta.id,
          name: baseName,
          baseName: baseName,
          poster: isGenericPlaceholder(meta.poster) ? null : meta.poster,
          logo: isGenericPlaceholder(meta.logo) ? null : meta.logo,
          background: isGenericPlaceholder(meta.background) ? null : meta.background,
          posterShape: meta.posterShape || "landscape",
          category: meta.category || "Divers",
          genres: meta.genres || [],
          type: meta.type,
          language: meta.language || "FR",
          sources: [],
        })
      }

      const group = channelGroups.get(groupKey)!
      group.sources.push({
        id: meta.id,
        name: meta.name,
        quality: quality,
        url: meta.id,
        priority: group.sources.length + 1,
      })

      // Update logo/poster if this variant has a better one
      if (!isGenericPlaceholder(meta.poster) && !group.poster) {
        group.poster = meta.poster
      }
      if (!isGenericPlaceholder(meta.logo) && !group.logo) {
        group.logo = meta.logo
      }
      if (!isGenericPlaceholder(meta.background) && !group.background) {
        group.background = meta.background
      }
    }

    const allChannels = Array.from(channelGroups.values())
    console.log(`[v0] Successfully loaded ${allChannels.length} grouped channels with multi-quality sources`)
    return allChannels
  } catch (error) {
    console.error("[v0] External API error:", error)
    return []
  }
}

export async function GET() {
  try {
    console.log("[v0] Fetching channels from database cache...")
    const supabase = await createClient()

    const { data: channels, error } = await supabase.from("catalog_cache").select("*").eq("enabled", true).order("name")

    if (error) {
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
