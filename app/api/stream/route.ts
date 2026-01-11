import { NextResponse } from "next/server"
import { getExternalId } from "../catalog/route"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const internalId = searchParams.get("id")

    if (!internalId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    const externalId = getExternalId(internalId)
    if (!externalId) {
      return NextResponse.json({ error: "Invalid channel ID" }, { status: 404 })
    }

    const apiUrl = `https://morning-wildflower-3cf3.wavewatchcontact.workers.dev/https://nakios.site/api/tv-live/channel/${externalId}`

    console.log("[v0] Fetching stream for internal ID:", internalId)

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Stream data received for internal ID")

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Stream API error:", error)
    return NextResponse.json({ error: "Unable to fetch stream" }, { status: 500 })
  }
}
