import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 })
  }

  const vavooUrl = `https://vavoo.to/play/${id}/index.m3u8`

  try {
    console.log("[v0] Resolving stream for ID:", id)

    const response = await fetch(vavooUrl, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://vavoo.to",
        Referer: "https://vavoo.to/",
      },
    })

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location")
      if (location) {
        console.log("[v0] Resolved CDN URL:", location.substring(0, 100))
        return NextResponse.json({
          success: true,
          originalUrl: vavooUrl,
          cdnUrl: location,
        })
      }
    }

    // If no redirect, return error
    return NextResponse.json(
      {
        success: false,
        error: "No redirect found",
      },
      { status: 502 },
    )
  } catch (error) {
    console.error("[v0] Stream resolve error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
