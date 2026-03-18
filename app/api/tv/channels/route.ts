import { NextResponse } from "next/server"
import { NagaClient } from "@/lib/naga-client"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * GET /api/tv/channels
 *
 * Query params:
 *   country  – filter by country name (case-insensitive, e.g. "France")
 *   category – filter by category/group keyword (e.g. "sport")
 *   search   – search by channel name (case-insensitive)
 *   limit    – max results (default 100, max 500)
 *   offset   – pagination offset (default 0)
 *
 * Response shape (each item):
 * {
 *   "id":        "abc123",
 *   "name":      "TF1",
 *   "country":   "France",
 *   "category":  "General",
 *   "logo_url":  "https://...",
 *   "embed_url": "https://livewatch.vercel.app/watch?id=abc123"
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)

    const countryFilter   = searchParams.get("country")?.toLowerCase() ?? null
    const categoryFilter  = searchParams.get("category")?.toLowerCase() ?? null
    const searchFilter    = searchParams.get("search")?.toLowerCase() ?? null
    const limit           = Math.min(Number(searchParams.get("limit")  ?? "100"), 500)
    const offset          = Math.max(Number(searchParams.get("offset") ?? "0"),    0)

    // Fetch full catalog from Naga
    const naga = new NagaClient()
    const sig  = await naga.getAddonSig()
    if (!sig) {
      return NextResponse.json({ error: "Unable to authenticate with upstream source" }, { status: 502 })
    }

    const raw = await naga.fetchCatalog(sig)

    // Map to public shape & apply filters
    type PublicChannel = {
      id: string
      name: string
      country: string
      category: string
      logo_url: string
      embed_url: string
    }

    const baseUrl = origin // e.g. https://livewatch.vercel.app

    let channels: PublicChannel[] = raw
      .filter((ch) => ch.id && ch.name)
      .map((ch) => {
        // Extract category from group string  (e.g. "France ➾ Sport" → "Sport")
        let category = "General"
        const separators = ["➾", "⟾", "->", "→", "»", "›"]
        for (const sep of separators) {
          if (ch.group?.includes(sep)) {
            const parts = ch.group.split(sep)
            category = parts[parts.length - 1].trim() || "General"
            break
          }
        }

        return {
          id:        ch.id,
          name:      ch.name,
          country:   ch.country || "Unknown",
          category,
          logo_url:  ch.logo || "",
          embed_url: `${baseUrl}/watch?id=${encodeURIComponent(ch.id)}`,
        }
      })

    // Apply filters
    if (countryFilter) {
      channels = channels.filter((ch) => ch.country.toLowerCase().includes(countryFilter))
    }
    if (categoryFilter) {
      channels = channels.filter((ch) => ch.category.toLowerCase().includes(categoryFilter))
    }
    if (searchFilter) {
      channels = channels.filter((ch) => ch.name.toLowerCase().includes(searchFilter))
    }

    const total    = channels.length
    const paginated = channels.slice(offset, offset + limit)

    return NextResponse.json(
      {
        total,
        limit,
        offset,
        channels: paginated,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("[api/tv/channels] Error:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}
