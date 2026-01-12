import { type NextRequest, NextResponse } from "next/server"
import { getTvVooStreamUrl } from "@/lib/tvvoo-backend"

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

    const streamUrl = await getTvVooStreamUrl(countries, channelId)

    if (!streamUrl) {
      console.error("[v0] Stream not available for channel:", channelId)
      return NextResponse.json({ error: "Stream not available" }, { status: 404 })
    }

    console.log("[v0] Stream URL obtained:", streamUrl)

    if (streamUrl.includes("sunshine") || streamUrl.includes("http")) {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`

      return NextResponse.json({
        streamUrl: proxyUrl,
        originalUrl: streamUrl,
      })
    }

    return NextResponse.json({
      streamUrl: streamUrl,
      originalUrl: streamUrl,
    })
  } catch (error) {
    console.error("[v0] Error fetching stream:", error)
    return NextResponse.json({ error: "Failed to fetch stream" }, { status: 500 })
  }
}
