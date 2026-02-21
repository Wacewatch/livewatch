import { NextResponse } from "next/server"
import { getAddonSig, fetchCatalog, getChannelsByCountry } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")

    if (!country) {
      return NextResponse.json({ error: "Country parameter required" }, { status: 400 })
    }

    console.log("[v0] Delta: Fetching channels for", country)

    // Get signature via ping
    const sig = await getAddonSig()
    if (!sig) {
      console.error("[v0] Delta: No token")
      return NextResponse.json({ error: "No token" }, { status: 503 })
    }

    // Fetch catalog with caching
    const allChannels = await fetchCatalog(sig)
    console.log("[v0] Delta: Total", allChannels.length, "channels")

    // Filter by country
    let channels = getChannelsByCountry(allChannels, country)
    console.log("[v0] Delta:", channels.length, "channels for", country)

    // Enrich channels with proper metadata for display
    channels = channels.map((ch) => ({
      id: ch.id,
      name: ch.cleanName || ch.name,
      logo: ch.logo || "",
      category: ch.genre || "",
      quality: ch.quality || "",
      language: "fr", // Default to French
      country: ch.country,
      url: ch.url,
    }))

    return NextResponse.json(channels)
  } catch (error) {
    console.error("[v0] Error fetching Delta channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
