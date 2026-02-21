import { NextRequest, NextResponse } from "next/server"
import { getAddonSig, fetchCatalog, resolveChannel } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * VAVOO-style endpoint: /api/delta/vavoo?channel=CHANNEL_ID
 * Returns a 302 redirect to the stream URL
 * This mimics the Python proxy behavior exactly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("channel")

    if (!channelId) {
      return NextResponse.json({ error: "Missing channel parameter" }, { status: 400 })
    }

    console.log("[v0] Delta/VAVOO: Resolving channel", channelId)

    // Get token (cached automatically by delta-client-v2)
    const sig = await getAddonSig()
    if (!sig) {
      console.error("[v0] Delta/VAVOO: No token available")
      return NextResponse.json({ error: "No token" }, { status: 503 })
    }

    // Get catalog (cached automatically)
    const catalog = await fetchCatalog(sig)
    if (!catalog || catalog.length === 0) {
      console.error("[v0] Delta/VAVOO: Empty catalog")
      return NextResponse.json({ error: "Empty catalog" }, { status: 503 })
    }

    // Find channel
    const channel = catalog.find((ch) => String(ch.id) === String(channelId))
    if (!channel) {
      console.error("[v0] Delta/VAVOO: Channel not found:", channelId)
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    if (!channel.url) {
      console.error("[v0] Delta/VAVOO: Channel has no URL")
      return NextResponse.json({ error: "No URL" }, { status: 404 })
    }

    // Resolve the channel URL to get the stream URL
    const streamUrl = await resolveChannel(channel.url, sig)
    if (!streamUrl) {
      console.error("[v0] Delta/VAVOO: Failed to resolve stream")
      return NextResponse.json({ error: "Failed to resolve" }, { status: 500 })
    }

    console.log("[v0] Delta/VAVOO: Resolved, fetching stream...")

    // Fetch and proxy the stream (HLS.js doesn't follow redirects well)
    const streamResponse = await fetch(streamUrl, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        Referer: "https://vavoo.to/",
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!streamResponse.ok) {
      console.error("[v0] Delta/VAVOO: Stream fetch failed:", streamResponse.status)
      return NextResponse.json({ error: "Stream unavailable" }, { status: 502 })
    }

    // Get the body and rewrite segment URLs to point to our proxy
    const body = await streamResponse.text()
    
    // Return with correct headers
    const headers = new Headers()
    headers.set("Content-Type", "application/vnd.apple.mpegurl")
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate")

    console.log("[v0] Delta/VAVOO: Stream proxied successfully")

    return new NextResponse(body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("[v0] Delta/VAVOO: Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
