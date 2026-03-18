import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * GET /api/tv/channels
 *
 * Reads channels from the Supabase `delta_channels` table (source of truth for logos & metadata).
 *
 * Query params:
 *   country  – filter by country (case-insensitive, e.g. "France")
 *   category – filter by category keyword (e.g. "sport")
 *   search   – search by channel name (case-insensitive)
 *   limit    – max results (default 100, max 500)
 *   offset   – pagination offset (default 0)
 *
 * Response shape (each item):
 * {
 *   "id":        "vavoo_13EME%20RUE|group:fr",
 *   "name":      "13EME RUE",
 *   "country":   "France",
 *   "category":  "Entertainment",
 *   "language":  "fr",
 *   "logo_url":  "https://...",
 *   "embed_url": "https://livewatch.vercel.app/player?url=vavoo_13EME%2520RUE%7Cgroup%3Afr"
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)

    const countryFilter  = searchParams.get("country")  ?? null
    const categoryFilter = searchParams.get("category") ?? null
    const searchFilter   = searchParams.get("search")   ?? null
    const limit          = Math.min(Number(searchParams.get("limit")  ?? "100"), 500)
    const offset         = Math.max(Number(searchParams.get("offset") ?? "0"),    0)

    const supabase = await createClient()

    // Build query on delta_channels (enabled channels only)
    let query = supabase
      .from("delta_channels")
      .select("id, name, country, category, language, logo", { count: "exact" })
      .eq("enabled", true)
      .order("name", { ascending: true })

    if (countryFilter) {
      query = query.ilike("country", `%${countryFilter}%`)
    }
    if (categoryFilter) {
      query = query.ilike("category", `%${categoryFilter}%`)
    }
    if (searchFilter) {
      query = query.ilike("name", `%${searchFilter}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[api/tv/channels] Supabase error:", error)
      return NextResponse.json({ error: "Failed to fetch channels from database" }, { status: 500 })
    }

    const baseUrl = origin

    const channels = (data ?? []).map((ch) => ({
      id:        ch.id,
      name:      ch.name,
      country:   ch.country ?? "Unknown",
      category:  ch.category ?? "General",
      language:  ch.language ?? null,
      logo_url:  ch.logo ?? null,
      // embed_url = /player?url=<double-encoded id>
      // The player page expects url= to be the raw channel id, so we encode once here.
      // Consumers who embed this in an <iframe> should use this URL directly.
      embed_url: `${baseUrl}/player?url=${encodeURIComponent(ch.id)}`,
    }))

    return NextResponse.json(
      {
        total:  count ?? channels.length,
        limit,
        offset,
        channels,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("[api/tv/channels] Error:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
