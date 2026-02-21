import { NextResponse } from "next/server"
import { DeltaClient } from "@/lib/delta-client"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")

    if (!country) {
      return NextResponse.json({ error: "Country parameter required" }, { status: 400 })
    }

    console.log("[v0] Fetching Delta channels for country:", country)

    const deltaClient = new DeltaClient()
    
    // Get signature first
    const sig = await deltaClient.getAddonSig()
    if (!sig) {
      throw new Error("Failed to get Delta signature")
    }
    
    // Fetch catalog
    const allChannels = await deltaClient.fetchCatalog(sig)
    console.log("[v0] Delta loaded", allChannels.length, "total channels")
    
    // Then filter by country
    const channels = deltaClient.getChannelsByCountry(allChannels, country)
    console.log(`[v0] Loaded ${channels.length} Delta channels for ${country}`)

    return NextResponse.json(channels)
  } catch (error) {
    console.error("[v0] Error fetching Delta channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
