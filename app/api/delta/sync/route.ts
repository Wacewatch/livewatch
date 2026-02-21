import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getAddonSig, fetchCatalog, getCountries } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 300

const supabaseService = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Check if request is from cron job or admin user
    const authHeader = request.headers.get("authorization")
    const isCronJob = authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    if (!isCronJob) {
      // Verify admin user
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }
    }
    
    console.log("[v0] Delta Sync: Starting sync...", isCronJob ? "(cron)" : "(manual)")

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
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      flag: countryFlags[name] || "🌍",
      channel_count: 0,
    }))

    // Delete existing countries and insert new ones
    console.log("[v0] Delta Sync: Deleting existing countries...")
    const { error: deleteCountriesError } = await supabaseService.from("delta_countries").delete().neq("id", "")
    if (deleteCountriesError) {
      console.error("[v0] Delta Sync: Delete countries error:", deleteCountriesError)
    }
    
    console.log("[v0] Delta Sync: Inserting", countries.length, "countries...")
    const { error: countriesError } = await supabaseService
      .from("delta_countries")
      .insert(countries)

    if (countriesError) {
      console.error("[v0] Delta Sync: Countries error:", countriesError)
      throw countriesError
    }

    console.log("[v0] Delta Sync: Synced", countries.length, "countries")

    // Prepare channels for database
    const channelsData = channels.map((ch) => ({
      id: ch.id,
      name: ch.cleanName || ch.name,
      clean_name: ch.cleanName || ch.name,
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

    // Delete all existing channels first
    console.log("[v0] Delta Sync: Deleting existing channels...")
    const { error: deleteError } = await supabaseService.from("delta_channels").delete().neq("id", "")
    if (deleteError) {
      console.error("[v0] Delta Sync: Delete error:", deleteError)
    }
    
    // Insert channels in chunks
    console.log("[v0] Delta Sync: Inserting", channelsData.length, "channels in chunks...")
    for (let i = 0; i < channelsData.length; i += chunkSize) {
      const chunk = channelsData.slice(i, i + chunkSize)
      const { error: channelsError } = await supabaseService
        .from("delta_channels")
        .insert(chunk)

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
