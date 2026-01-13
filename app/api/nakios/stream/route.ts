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

    const nakiosUrl = `${NAKIOS_API_BASE}/${channelId}`
    console.log("[v0] Calling Nakios URL:", nakiosUrl)

    const response = await fetch(nakiosUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://nakios.site/",
        Origin: "https://nakios.site",
      },
      cache: "no-cache",
    })

    console.log("[v0] Nakios response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Nakios API error:", response.status, errorText)
      return NextResponse.json(
        {
          error: "Failed to fetch stream from Nakios",
          details: errorText,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] Nakios response data:", JSON.stringify(data, null, 2))

    if (!data.success || !data.data?.streamer) {
      console.error("[v0] Nakios returned no streamer URL, full data:", data)
      return NextResponse.json({ error: "No stream available", data }, { status: 404 })
    }

    console.log("[v0] Nakios stream URL retrieved successfully:", data.data.streamer)

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
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
