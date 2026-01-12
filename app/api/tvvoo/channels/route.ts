import { NextResponse } from "next/server"
import { fetchTvVooCatalog, fetchTvVooManifest } from "@/lib/tvvoo-backend"

const channelsCache: Map<string, { data: any[]; timestamp: number }> = new Map()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const countriesParam = searchParams.get("countries")
  const countries = countriesParam ? countriesParam.split(",") : ["France"]

  const cacheKey = countries.join(",")
  const cached = channelsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("[v0] Serving channels from cache for:", cacheKey)
    return NextResponse.json(cached.data)
  }

  try {
    console.log("[v0] Loading TvVoo channels for countries:", countries)

    const manifest = await fetchTvVooManifest(countries)

    if (!manifest) {
      console.error("[v0] Failed to load manifest from TvVoo")
      return NextResponse.json({ error: "Failed to load manifest" }, { status: 500 })
    }

    const tvCatalog = manifest.catalogs?.find((c) => c.type === "tv")

    if (!tvCatalog) {
      console.error("[v0] No TV catalog found in manifest")
      return NextResponse.json({ error: "No TV catalog available" }, { status: 500 })
    }

    const catalog = await fetchTvVooCatalog(countries, "tv", tvCatalog.id)

    if (!catalog || !catalog.metas) {
      console.error("[v0] Failed to load catalog from TvVoo")
      return NextResponse.json({ error: "Failed to load channels" }, { status: 500 })
    }

    const channels = catalog.metas.map((meta) => ({
      id: meta.id,
      baseId: meta.id,
      name: meta.name,
      baseName: meta.name,
      logo: meta.logo && !meta.logo.includes("tvvoo") ? meta.logo : null,
      poster: meta.poster && !meta.poster.includes("tvvoo") ? meta.poster : null,
      background: meta.poster && !meta.poster.includes("tvvoo") ? meta.poster : null,
      country: meta.country || countries[0],
      category: meta.category || "General",
      language: countries[0] === "France" ? "FR" : countries[0],
      sources: [{ name: meta.name, url: "", quality: "HD", priority: 1 }],
      enabled: true,
    }))

    channelsCache.set(cacheKey, {
      data: channels,
      timestamp: Date.now(),
    })

    return NextResponse.json(channels)
  } catch (error) {
    console.error("[v0] Error loading TvVoo channels:", error)
    return NextResponse.json({ error: "Failed to load channels" }, { status: 500 })
  }
}
