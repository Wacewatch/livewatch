import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("id")
    const sourceId = searchParams.get("sourceId") // Optional specific source

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    const apiUrl = `https://morning-wildflower-3cf3.wavewatchcontact.workers.dev/https://nakios.site/api/tv-live/channel/${channelId}`

    console.log("[v0] Fetching stream for channel:", channelId, sourceId ? `source: ${sourceId}` : "")

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.data) {
      // If sourceId is specified, find that specific source
      if (sourceId && data.data.sources) {
        const source = data.data.sources.find((s: any) => s.name === sourceId || s.quality === sourceId)
        if (source) {
          return NextResponse.json({
            ...data,
            data: {
              ...data.data,
              url: source.url,
              quality: source.quality,
            },
          })
        }
      }
    }

    console.log("[v0] Stream data received, sources available:", data.data?.sources?.length || 0)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Stream API error:", error)
    return NextResponse.json({ error: "Unable to fetch stream" }, { status: 500 })
  }
}
