import { type NextRequest, NextResponse } from "next/server"
import { NagaClient } from "@/lib/naga-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const channelId = searchParams.get("id")
    const channelUrl = searchParams.get("url")

    if (!channelId && !channelUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing channel ID or URL",
        },
        { status: 400 },
      )
    }

    const nagaClient = new NagaClient()

    let streamUrl: string | null = null

    if (channelUrl) {
      // Resolve from URL directly
      console.log(`[v0] Naga: Resolving stream from URL: ${channelUrl}`)
      const sig = await nagaClient.getAddonSig()
      if (!sig) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to obtain authentication token",
          },
          { status: 503 },
        )
      }
      streamUrl = await nagaClient.resolveChannel(channelUrl, sig)
    } else if (channelId) {
      // Resolve from channel ID
      console.log(`[v0] Naga: Resolving stream for channel ID: ${channelId}`)
      streamUrl = await nagaClient.resolveStream(channelId)
    }

    if (!streamUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not resolve stream - channel may be offline",
        },
        { status: 404 },
      )
    }

    console.log("[v0] Naga: Stream resolved successfully")

    return NextResponse.json({
      success: true,
      streamUrl,
      headers: "User-Agent=MediaHubMX/2",
    })
  } catch (error) {
    console.error("[v0] Naga stream error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
