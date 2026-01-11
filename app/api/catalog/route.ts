import { NextResponse } from "next/server"

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
        return url.includes("qwertyuiop8899") || url.includes("tvvoo.png")
      }

      const channels =
        data.metas?.map((meta: any) => {
          const groupMatch = meta.id?.match(/group:(\w+)/)
          const language = groupMatch ? groupMatch[1].toUpperCase() : "FR"

          const hasHD = meta.name?.includes("HD")
          const has4K = meta.name?.includes("4K")
          const quality = has4K ? "4K" : hasHD ? "HD" : "SD"

          return {
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
            priority: 1,
          }
        }) || []

      console.log("[v0] Successfully fetched", channels.length, "channels")

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
