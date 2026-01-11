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

    const channelGroups = new Map<string, any[]>()

    data.metas?.forEach((meta: any) => {
      const groupMatch = meta.id?.match(/group:(\w+)/)
      const language = groupMatch ? groupMatch[1].toUpperCase() : "FR"

      const nameUpper = meta.name?.toUpperCase() || ""
      const has4K = nameUpper.includes("4K") || nameUpper.includes("UHD")
      const hasFHD = nameUpper.includes("FHD")
      const hasHD = nameUpper.includes("HD") && !hasFHD
      const quality = has4K ? "4K" : hasFHD ? "FHD" : hasHD ? "HD" : "SD"

      const baseName = getBaseName(meta.name)
      const groupKey = `${baseName}_${language}`

      if (!channelGroups.has(groupKey)) {
        channelGroups.set(groupKey, [])
      }

      channelGroups.get(groupKey)!.push({
        id: meta.id,
        name: meta.name,
        poster: isGenericPlaceholder(meta.poster) ? null : meta.poster,
        logo: isGenericPlaceholder(meta.logo) ? null : meta.logo,
        background: isGenericPlaceholder(meta.background) ? null : meta.background,
        posterShape: meta.posterShape || "landscape",
        category: meta.genres?.[0] || "Divers",
        genres: meta.genres || [],
        type: meta.type || "tv",
        language,
        quality,
        baseName,
      })
    })

    const channels: any[] = []
    channelGroups.forEach((variants) => {
      // Sort variants by quality (4K > FHD > HD > SD)
      const qualityOrder = { "4K": 4, FHD: 3, HD: 2, SD: 1 }
      variants.sort(
        (a, b) =>
          (qualityOrder[b.quality as keyof typeof qualityOrder] || 0) -
          (qualityOrder[a.quality as keyof typeof qualityOrder] || 0),
      )

      const primary = variants[0]
      const bestLogo = variants.find((v) => v.logo)?.logo || primary.logo
      const bestBackground = variants.find((v) => v.background)?.background || primary.background
      const bestPoster = variants.find((v) => v.poster)?.poster || primary.poster

      channels.push({
        id: primary.id,
        name: primary.name,
        baseName: primary.baseName,
        poster: bestPoster,
        logo: bestLogo,
        background: bestBackground,
        posterShape: primary.posterShape,
        category: primary.category,
        genres: primary.genres,
        type: primary.type,
        language: primary.language,
        quality: primary.quality,
        sources: variants.map((v) => ({
          id: v.id,
          name: v.name,
          quality: v.quality,
        })),
      })
    })

    console.log("[v0] Successfully grouped channels:", channels.length, "unique channels")

    return NextResponse.json({ channels })
  } catch (error) {
    console.error("[v0] Catalog API error:", error)
    return NextResponse.json({ error: "Unable to fetch catalog", channels: [] }, { status: 500 })
  }
}
