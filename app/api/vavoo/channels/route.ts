import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching Vavoo channels")

    const response = await fetch("https://vavoo.to/channels", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://vavoo.to/",
        Origin: "https://vavoo.to",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error("[v0] Vavoo API error:", response.status)
      return NextResponse.json({ error: "Failed to fetch channels from Vavoo" }, { status: response.status })
    }

    const channels = await response.json()
    console.log("[v0] Successfully fetched", channels.length, "channels from Vavoo")

    return NextResponse.json({
      success: true,
      channels,
      total: channels.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching Vavoo channels:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch Vavoo channels",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
