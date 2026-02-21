import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAddonSig, fetchCatalog } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for full sync

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Delta Sync: Starting scheduled sync...")

    const supabase = await createClient()

    // Get Delta token
    const sig = await getAddonSig()
    if (!sig) {
      console.error("[v0] Delta Sync: Failed to get token")
      return NextResponse.json({ error: "No token" }, { status: 503 })
    }

    // Fetch all channels from Delta
    const allChannels = await fetchCatalog(sig)
    console.log("[v0] Delta Sync: Fetched", allChannels.length, "channels")

    // Extract unique countries
    const countrySet = new Set<string>()
    allChannels.forEach((ch) => {
      if (ch.country) countrySet.add(ch.country)
    })

    const countries = Array.from(countrySet).map((name) => ({
      name,
      flag: getCountryFlag(name),
      code: name.toLowerCase().replace(/\s+/g, "-"),
    }))

    // Upsert countries
    const { error: countriesError } = await supabase.from("delta_countries").upsert(countries, {
      onConflict: "name",
      ignoreDuplicates: false,
    })

    if (countriesError) {
      console.error("[v0] Delta Sync: Countries error:", countriesError)
      throw countriesError
    }

    console.log("[v0] Delta Sync: Synced", countries.length, "countries")

    // Prepare channels for insert
    const channelsToInsert = allChannels.map((ch) => ({
      delta_id: ch.id,
      name: ch.cleanName || ch.name,
      logo: ch.logo || "",
      category: ch.genre || "Divers",
      quality: ch.quality || "HD",
      language: "fr",
      country: ch.country,
      url: ch.url,
      enabled: true,
    }))

    // Batch upsert channels (500 at a time)
    const batchSize = 500
    let syncedCount = 0

    for (let i = 0; i < channelsToInsert.length; i += batchSize) {
      const batch = channelsToInsert.slice(i, i + batchSize)
      const { error: channelsError } = await supabase.from("delta_channels").upsert(batch, {
        onConflict: "delta_id",
        ignoreDuplicates: false,
      })

      if (channelsError) {
        console.error("[v0] Delta Sync: Channels batch error:", channelsError)
        throw channelsError
      }

      syncedCount += batch.length
      console.log("[v0] Delta Sync: Progress", syncedCount, "/", channelsToInsert.length)
    }

    console.log("[v0] Delta Sync: Successfully synced", syncedCount, "channels")

    return NextResponse.json({
      success: true,
      countries: countries.length,
      channels: syncedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Delta Sync: Error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

function getCountryFlag(name: string): string {
  const flags: Record<string, string> = {
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
  return flags[name] || "🌍"
}
