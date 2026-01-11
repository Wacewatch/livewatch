import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  let normalized = name.toUpperCase().trim()

  // Remove combined quality + backup/evening suffixes first
  normalized = normalized
    .replace(/\s+(HD|FHD|4K|UHD|SD)\s+(BACKUP|EVENING|EVEN|EVENT|BACKUP2|BACKUP3)\s*$/i, "")
    .replace(/\s+(BACKUP|EVENING|EVEN|EVENT|BACKUP2|BACKUP3)\s+(HD|FHD|4K|UHD|SD)\s*$/i, "")

  // Remove standalone backup/evening keywords
  normalized = normalized.replace(/\s+(BACKUP|EVENING|EVEN|EVENT|BACKUP2|BACKUP3)\s*$/i, "")

  // Remove quality indicators at the end
  normalized = normalized.replace(/\s+(HD|FHD|4K|UHD|SD|HEVC|H\.264|H264)\s*$/i, "")

  // Remove special characters but keep alphanumeric and spaces
  normalized = normalized.replace(/[^A-Z0-9\s]/g, " ")

  // Normalize multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim()

  return normalized
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
          displayName: channel.name,
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

      // Use best available images
      if (channel.logo && !grouped.logo) grouped.logo = channel.logo
      if (channel.background && !grouped.background) grouped.background = channel.background
      if (channel.poster && !grouped.poster) grouped.poster = channel.poster

      // Use shortest name as display name (usually cleanest)
      if (channel.name.length < grouped.displayName.length) {
        grouped.displayName = channel.name
      }
    }

    let channels = Array.from(groupedMap.values()).map((group) => {
      group.sources.sort((a: any, b: any) => b.priority - a.priority)
      return group
    })

    try {
      const supabase = await createClient()
      const { data: enabledChannels } = await supabase.from("channels").select("id, enabled").eq("enabled", true)

      if (enabledChannels && enabledChannels.length > 0) {
        const enabledIds = new Set(enabledChannels.map((c) => c.id))
        channels = channels.filter((ch) => enabledIds.has(ch.baseName) || enabledIds.has(ch.baseId))
      }
    } catch (dbError) {
      console.log("[v0] Database filter skipped (table may not exist yet):", dbError)
    }

    console.log("[v0] Successfully fetched and grouped", channels.length, "unique channels")

    return NextResponse.json({ channels })
  } catch (error) {
    console.error("[v0] Catalog API error:", error)
    return NextResponse.json({ error: "Unable to fetch catalog", channels: [] }, { status: 500 })
  }
}
