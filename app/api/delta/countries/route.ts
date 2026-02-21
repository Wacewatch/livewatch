import { NextResponse } from "next/server"
import { DeltaClient } from "@/lib/delta-client"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  try {
    console.log("[v0] Fetching Delta countries...")

    const deltaClient = new DeltaClient()
    const countries = await deltaClient.getCountries()

    console.log(`[v0] Loaded ${countries.length} Delta countries`)

    return NextResponse.json(countries)
  } catch (error) {
    console.error("[v0] Error fetching Delta countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
  }
}
