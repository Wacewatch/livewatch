import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("id")

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel ID" }, { status: 400 })
  }

  const initialUrl = `https://vavoo.to/play/${channelId}/index.m3u8`

  console.log("[v0] Resolving m3u8 URL for channel:", channelId)
  console.log("[v0] Initial URL:", initialUrl)

  try {
    const response = await fetch(initialUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://vavoo.to/",
        Origin: "https://vavoo.to",
      },
    })

    const finalUrl = response.url
    console.log("[v0] Resolved final URL:", finalUrl)

    return NextResponse.json({
      initialUrl,
      finalUrl,
      status: response.status,
      ok: response.ok,
    })
  } catch (error) {
    console.error("[v0] Error resolving m3u8:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        initialUrl,
      },
      { status: 500 },
    )
  }
}
