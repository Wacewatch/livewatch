import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAddonSig, fetchCatalog, getCountries } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Delta Sync: Starting sync...")

    // Get Delta signature
    const sig = await getAddonSig()
    if (!sig) {
      throw new Error("Failed to get Delta signature")
    }

    // Fetch full catalog
    const channels = await fetchCatalog(sig)
    console.log("[v0] Delta Sync: Fetched", channels.length, "channels")

    // Extract countries
    const countryNames = getCountries(channels)
    console.log("[v0] Delta Sync: Found", countryNames.length, "countries")

    // Sync countries to database
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

    await supabase.from("delta_countries").delete().neq("name", "")
    const { error: countriesError } = await supabase.from("delta_countries").insert(countries)

    if (countriesError) {
      console.error("[v0] Delta Sync: Countries error:", countriesError)
      throw countriesError
    }

    console.log("[v0] Delta Sync: Synced", countries.length, "countries")

    // Prepare channels for database
    const channelsData = channels.map((ch) => ({
      delta_id: ch.id,
      name: ch.cleanName || ch.name,
      logo: ch.logo || "",
      category: ch.genre || "",
      quality: ch.quality || "",
      language: "fr",
      country: ch.country || "",
      url: ch.url || "",
      enabled: true,
    }))

    // Batch insert channels (in chunks of 1000)
    const chunkSize = 1000
    let synced = 0

    await supabase.from("delta_channels").delete().neq("delta_id", "")

    for (let i = 0; i < channelsData.length; i += chunkSize) {
      const chunk = channelsData.slice(i, i + chunkSize)
      const { error: channelsError } = await supabase.from("delta_channels").insert(chunk)

      if (channelsError) {
        console.error("[v0] Delta Sync: Channels error:", channelsError)
        throw channelsError
      }

      synced += chunk.length
      console.log("[v0] Delta Sync: Synced", synced, "/", channelsData.length, "channels")
    }

    console.log("[v0] Delta Sync: Complete!")

    return NextResponse.json({
      success: true,
      countries: countries.length,
      channels: channelsData.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Delta Sync: Error:", error)
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
