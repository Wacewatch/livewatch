import { type NextRequest, NextResponse } from "next/server"
import { getTvVooStreams } from "@/lib/tvvoo-backend"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("channel")
  const countriesParam = searchParams.get("countries")
  const countries = countriesParam ? countriesParam.split(",") : ["France"]

  if (!channelId) {
    return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
  }

  try {
    console.log("[v0] Fetching stream for channel:", channelId, "countries:", countries)

    const streams = await getTvVooStreams(countries, channelId)

    if (!streams || streams.length === 0) {
      console.error("[v0] Stream not available for channel:", channelId)
      return NextResponse.json({ error: "Stream not available" }, { status: 404 })
    }

    console.log("[v0] Found", streams.length, "stream(s) for channel")
    console.log("[v0] Stream titles:", streams.map(s => s.title).join(", "))

    // Return all streams with their metadata
    const streamSources = streams.map((stream, index) => {
      const streamUrl = stream.url
      const isDirect = stream.title?.toLowerCase().includes("direct") || false
      
      // Don't use proxy for "direct" sources, only for sunshine URLs
      const proxyUrl = !isDirect && streamUrl.includes("sunshine")
        ? `/api/proxy?url=${encodeURIComponent(streamUrl)}`
        : streamUrl

      return {
        id: stream.title || `Source ${index + 1}`,
        name: stream.title || `Source ${index + 1}`,
        streamUrl: proxyUrl,
        originalUrl: streamUrl,
        isDirect: isDirect,
      }
    })

    // For backward compatibility, also return the first stream as default
    console.log("[v0] Returning", streamSources.length, "sources:", streamSources.map(s => s.name).join(", "))
    return NextResponse.json({
      streamUrl: streamSources[0].streamUrl,
      originalUrl: streamSources[0].originalUrl,
      sources: streamSources,
    })
  } catch (error) {
    console.error("[v0] Error fetching stream:", error)
    return NextResponse.json({ error: "Failed to fetch stream" }, { status: 500 })
  }
}
