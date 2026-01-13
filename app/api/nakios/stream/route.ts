import { type NextRequest, NextResponse } from "next/server"

const NAKIOS_API_BASE = "https://nakios.site/api/tv-live/channel"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("channel")

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    console.log("[v0] Fetching Nakios stream for channel:", channelId)

    // Call Nakios API with the channel ID
    const nakiosUrl = `${NAKIOS_API_BASE}/${encodeURIComponent(channelId)}`
    const response = await fetch(nakiosUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-cache",
    })

    if (!response.ok) {
      console.error("[v0] Nakios API error:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch stream from Nakios" }, { status: response.status })
    }

    const data = await response.json()

    if (!data.success || !data.data?.streamer) {
      console.error("[v0] Nakios returned no streamer URL")
      return NextResponse.json({ error: "No stream available" }, { status: 404 })
    }

    console.log("[v0] Nakios stream URL retrieved successfully")

    return NextResponse.json({
      success: true,
      streamUrl: data.data.streamer,
      channelInfo: {
        id: data.data.id,
        name: data.data.name,
        logo: data.data.logo,
        poster: data.data.poster,
      },
    })
  } catch (error) {
    console.error("[v0] Error in Nakios stream endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
