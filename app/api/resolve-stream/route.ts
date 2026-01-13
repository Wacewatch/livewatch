import { type NextRequest, NextResponse } from "next/server"
import { VavooClient } from "@/lib/vavoo-client"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 })
  }

  try {
    console.log("[v0] Resolving stream for URL:", url)

    // VAVOO stream resolution using VavooClient
    const vavooClient = new VavooClient()
    const result = await vavooClient.resolveVavooStream(url)

    if (result) {
      console.log("[v0] Stream resolved successfully")
      return NextResponse.json({
        success: true,
        streamUrl: result.streamUrl,
        headers: result.headers,
      })
    }

    console.log("[v0] Stream resolution failed")
    return NextResponse.json(
      {
        success: false,
        error: "Stream not accessible",
      },
      { status: 502 },
    )
  } catch (error) {
    console.error("[v0] Stream resolve error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
