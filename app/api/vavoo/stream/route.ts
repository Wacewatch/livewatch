import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("id")

  if (!channelId) {
    return NextResponse.json({ error: "Channel ID parameter is required" }, { status: 400 })
  }

  try {
    console.log("[v0] Resolving Vavoo stream for channel:", channelId)

    // Retourner l'URL du proxy qui gérera le stream
    const proxyUrl = `/api/vavoo/proxy?id=${channelId}&path=index.m3u8`

    return NextResponse.json({
      success: true,
      streamUrl: proxyUrl,
      channelId,
      provider: "vavoo",
    })
  } catch (error) {
    console.error("[v0] Error resolving Vavoo stream:", error)
    return NextResponse.json(
      {
        error: "Failed to resolve stream",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
