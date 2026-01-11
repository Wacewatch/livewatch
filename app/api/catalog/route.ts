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

    const contentType = response.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      const text = await response.text()
      console.error("[v0] Catalog API returned non-JSON:", text.substring(0, 100))

      // Return cached/fallback data if rate limited
      return NextResponse.json(
        {
          error: "API temporarily unavailable",
          message: text.substring(0, 100),
          channels: [],
        },
        { status: 503 },
      )
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully fetched", data?.channels?.length || 0, "channels")
    return NextResponse.json(data)
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
