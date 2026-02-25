import { NextResponse } from "next/server"
import { DeltaClient } from "@/lib/delta-client"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("id")

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    console.log("[v0] Resolving Delta stream for channel:", channelId)

    const deltaClient = new DeltaClient()
    const streamData = await deltaClient.resolveStream(channelId)

    if (!streamData) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 })
    }

    console.log("[v0] Delta stream resolved:", streamData.url)

    return NextResponse.json({
      url: streamData.url,
      channel: streamData.channel,
    })
  } catch (error) {
    console.error("[v0] Error resolving Delta stream:", error)
    return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 })
  }
}
