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

    console.log("[v0] Delta/VAVOO: Resolved to stream URL")

    // Return a 302 redirect like the Python proxy does
    return NextResponse.redirect(streamUrl, 302)
  } catch (error) {
    console.error("[v0] Delta/VAVOO: Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
