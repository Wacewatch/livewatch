import { type NextRequest, NextResponse } from "next/server"
import { NagaClient } from "@/lib/naga-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get("country")

    const nagaClient = new NagaClient()

    if (country) {
      // Get channels for a specific country
      console.log(`[v0] Naga: Fetching channels for country: ${country}`)
      const channels = await nagaClient.getChannelsByCountry(country)

      return NextResponse.json({
        success: true,
        country,
        channels,
        count: channels.length,
      })
    }

    // Get all countries
    console.log("[v0] Naga: Fetching all countries")
    const countries = await nagaClient.getCountries()

    return NextResponse.json({
      success: true,
      countries,
      count: countries.length,
    })
  } catch (error) {
    console.error("[v0] Naga channels error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
