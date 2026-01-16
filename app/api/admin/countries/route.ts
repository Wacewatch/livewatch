import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ALL_COUNTRIES = [
  { name: "France", code: "fr" },
  { name: "Italy", code: "it" },
  { name: "Spain", code: "es" },
  { name: "Portugal", code: "pt" },
  { name: "Germany", code: "de" },
  { name: "United Kingdom", code: "gb" },
  { name: "Belgium", code: "be" },
  { name: "Netherlands", code: "nl" },
  { name: "Switzerland", code: "ch" },
  { name: "Albania", code: "al" },
  { name: "Turkey", code: "tr" },
  { name: "Arabia", code: "sa" },
  { name: "Balkans", code: "rs" },
  { name: "Russia", code: "ru" },
  { name: "Romania", code: "ro" },
  { name: "Poland", code: "pl" },
  { name: "Bulgaria", code: "bg" },
]

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: dbCountries } = await supabase.from("countries").select("*")
    const dbCountryMap = new Map((dbCountries || []).map((c) => [c.name, c]))

    const countriesWithCount = await Promise.all(
      ALL_COUNTRIES.map(async (country) => {
        const dbCountry = dbCountryMap.get(country.name)
        let channelCount = 0

        try {
          // Fetch channel count from TvVoo API
          const manifestUrl = `https://tvvoo.hayd.uk/cfg-${country.code}/manifest.json`
          const manifestRes = await fetch(manifestUrl, {
            signal: AbortSignal.timeout(5000),
            cache: "no-store",
          })

          if (manifestRes.ok) {
            const manifest = await manifestRes.json()
            const catalogs = manifest.catalogs || []

            for (const catalog of catalogs) {
              if (catalog.type === "tv") {
                const catalogUrl = `https://tvvoo.hayd.uk/cfg-${country.code}/catalog/tv/${catalog.id}.json`
                const catalogRes = await fetch(catalogUrl, {
                  signal: AbortSignal.timeout(5000),
                  cache: "no-store",
                })

                if (catalogRes.ok) {
                  const catalogData = await catalogRes.json()
                  channelCount += (catalogData.metas || []).length
                }
              }
            }
          }
        } catch (e) {
          console.error(`[v0] Failed to fetch channel count for ${country.name}:`, e)
        }

        return {
          id: dbCountry?.id || country.code,
          name: country.name,
          code: country.code,
          enabled: dbCountry?.enabled ?? true,
          channel_count: channelCount,
        }
      }),
    )

    return NextResponse.json({ countries: countriesWithCount })
  } catch (error) {
    console.error("[v0] Failed to fetch countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, name, code, enabled } = await request.json()

    const { error } = await supabase.from("countries").upsert(
      {
        id: id || code,
        name: name,
        enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to update country:", error)
    return NextResponse.json({ error: "Failed to update country" }, { status: 500 })
  }
}
