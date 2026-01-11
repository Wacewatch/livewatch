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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const text = await response.text()

    try {
      const data = JSON.parse(text)

      const channels =
        data.metas?.map((meta: any) => ({
          id: meta.id,
          name: meta.name,
          logo: meta.poster,
          group: meta.id.includes("|group:") ? meta.id.split("|group:")[1] : "Other",
          type: meta.type || "tv",
        })) || []

      console.log("[v0] Successfully fetched", channels.length, "channels")

      return NextResponse.json({ channels })
    } catch (parseError) {
      console.error("[v0] JSON parse error:", text.substring(0, 200))
      return NextResponse.json(
        {
          error: "Invalid JSON response",
          message: "Unable to parse catalog data",
          channels: [],
        },
        { status: 503 },
      )
    }
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
