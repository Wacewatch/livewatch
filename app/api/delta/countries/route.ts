import { NextResponse } from "next/server"
import { getAddonSig, fetchCatalog, getCountries } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  try {
    console.log("[v0] Delta: Fetching countries...")

    // Get signature via ping (uses cache if valid)
    const sig = await getAddonSig()
    if (!sig) {
      console.error("[v0] Delta: Failed to get token")
      return NextResponse.json({ error: "No token" }, { status: 503 })
    }

    // Fetch catalog (uses cache if valid)
    const allChannels = await fetchCatalog(sig)
    console.log("[v0] Delta: Loaded", allChannels.length, "channels")

    // Extract unique countries
    const countryNames = getCountries(allChannels)
    console.log("[v0] Delta: Found", countryNames.length, "countries")

    // Transform country names to Country objects with flags
    const countryFlags: Record<string, string> = {
      France: "🇫🇷",
      Italy: "🇮🇹",
      Spain: "🇪🇸",
      Germany: "🇩🇪",
      UK: "🇬🇧",
      "United Kingdom": "🇬🇧",
      Belgium: "🇧🇪",
      Netherlands: "🇳🇱",
      Portugal: "🇵🇹",
      Switzerland: "🇨🇭",
      Austria: "🇦🇹",
      Poland: "🇵🇱",
      Turkey: "🇹🇷",
      Greece: "🇬🇷",
      USA: "🇺🇸",
      Canada: "🇨🇦",
    }

    const countries = countryNames.map((name) => ({
      name,
      flag: countryFlags[name] || "🌍",
      code: name.toLowerCase().replace(/\s+/g, "-"),
    }))

    return NextResponse.json(countries)
  } catch (error) {
    console.error("[v0] Error fetching Delta countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
  }
}
