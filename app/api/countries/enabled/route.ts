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

    // Get disabled countries from database
    const { data: dbCountries } = await supabase.from("countries").select("name, enabled")

    const countryStatusMap = new Map<string, boolean>()
    ;(dbCountries || []).forEach((c) => {
      countryStatusMap.set(c.name, c.enabled !== false)
    })

    const countryStatuses = ALL_COUNTRIES.map((c) => ({
      name: c.name,
      enabled: countryStatusMap.has(c.name) ? countryStatusMap.get(c.name) : true,
    }))

    // Also return just enabled countries for backward compatibility
    const enabledCountries = countryStatuses.filter((c) => c.enabled).map((c) => c.name)

    return NextResponse.json({
      countries: enabledCountries,
      countryStatuses: countryStatuses,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch enabled countries:", error)
    // Return all countries on error
    return NextResponse.json({
      countries: ALL_COUNTRIES.map((c) => c.name),
      countryStatuses: ALL_COUNTRIES.map((c) => ({ name: c.name, enabled: true })),
    })
  }
}
