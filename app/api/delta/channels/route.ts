import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")

    if (!country) {
      return NextResponse.json({ error: "Country parameter required" }, { status: 400 })
    }

    console.log("[v0] Delta: Fetching channels for", country, "from DB...")

    const supabase = await createClient()

    const { data: channels, error } = await supabase
      .from("delta_channels")
      .select("*")
      .eq("country", country)
      .eq("enabled", true)
      .order("name")

    if (error) {
      console.error("[v0] Delta: Channels DB error:", error)
      throw error
    }

    console.log("[v0] Delta: Loaded", channels?.length || 0, "channels from DB")

    // Map to expected format
    const mappedChannels = (channels || []).map((ch) => ({
      id: ch.id,
      name: ch.name,
      logo: ch.logo,
      category: ch.category,
      quality: ch.quality,
      language: ch.language,
      country: ch.country,
      url: ch.url,
    }))

    return NextResponse.json(mappedChannels)
  } catch (error) {
    console.error("[v0] Delta: Error fetching channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
