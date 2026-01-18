import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channel = searchParams.get("channel")

  if (!channel) {
    return NextResponse.json({ error: "Channel parameter is required" }, { status: 400 })
  }

  try {
    console.log("[v0] Fetching alternative stream for channel:", channel)

    const workerUrl = `https://morning-wildflower-3cf3.wavewatchcontact.workers.dev/https://nakios.site/api/tv-live/channel/${channel}`
    console.log("[v0] Calling worker proxy:", workerUrl.substring(0, 100))

    const response = await fetch(workerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-cache",
    })

    console.log("[v0] Worker response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Worker API error:", response.status, errorText)
      return NextResponse.json({ error: `Proxy error: HTTP ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Worker response data:", { success: data.success, hasStreamer: !!data.data?.streamer })

    let streamUrl = data.data?.streamer || data.streamer || data.data?.streamUrl || data.streamUrl

    if (!streamUrl) {
      console.error("[v0] No stream URL in response:", data)
      return NextResponse.json({ error: "No stream available" }, { status: 404 })
    }

    console.log("[v0] Alternative stream URL found:", streamUrl.substring(0, 100))

    // Si l'URL contient proxiesembed.movix.blog, la passer à travers le worker pour contourner le 403
    if (streamUrl.includes("proxiesembed.movix.blog") || streamUrl.includes("movix.blog")) {
      console.log("[v0] Detected movix.blog URL, proxying through worker")
      streamUrl = `https://hidden-thunder-be5f.wavewatchcontact.workers.dev/${streamUrl}`
    }

    return NextResponse.json({
      success: true,
      streamUrl: streamUrl,
      name: data.data?.name || data.name,
      logo: data.data?.logo || data.logo,
    })
  } catch (error) {
    console.error("[v0] Alternative stream API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch alternative stream",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
