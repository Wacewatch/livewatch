import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 10

export async function GET() {
  try {
    console.log("[v0] Delta: Fetching countries from DB...")

    const supabase = await createClient()

    const { data: countries, error } = await supabase
      .from("delta_countries")
      .select("*")
      .order("name")

    if (error) {
      console.error("[v0] Delta: Countries DB error:", error)
      throw error
    }

    console.log("[v0] Delta: Loaded", countries?.length || 0, "countries from DB")

    return NextResponse.json(countries || [])
  } catch (error) {
    console.error("[v0] Delta: Error fetching countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
  }
}
