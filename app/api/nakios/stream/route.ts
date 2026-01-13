import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channel = searchParams.get("channel")

  if (!channel) {
    return NextResponse.json({ error: "Channel parameter is required" }, { status: 400 })
  }

  try {
    console.log("[v0] Fetching Nakios stream for channel:", channel)

    // Appel à l'API Nakios avec des headers de navigateur pour éviter le blocage
    const nakiosUrl = `https://nakios.site/api/tv-live/channel/${channel}`
    console.log("[v0] Calling Nakios API:", nakiosUrl)

    const response = await fetch(nakiosUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://nakios.site/",
        Origin: "https://nakios.site",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      cache: "no-cache",
    })

    console.log("[v0] Nakios response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Nakios API error:", response.status, errorText)
      return NextResponse.json(
        { error: `Nakios API error: HTTP ${response.status}`, details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] Nakios response data:", { success: data.success, hasStreamer: !!data.data?.streamer })

    if (!data.success || !data.data?.streamer) {
      console.error("[v0] No streamer URL in Nakios response:", data)
      return NextResponse.json({ error: "No stream available from Nakios" }, { status: 404 })
    }

    console.log("[v0] Nakios stream URL found:", data.data.streamer.substring(0, 100))

    return NextResponse.json({
      success: true,
      streamUrl: data.data.streamer,
      name: data.data.name,
      logo: data.data.logo,
    })
  } catch (error) {
    console.error("[v0] Nakios API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch stream from Nakios",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
