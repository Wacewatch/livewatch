import { type NextRequest, NextResponse } from "next/server"
import { StalkerPortalClient } from "@/lib/stalker-client"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cmd = searchParams.get("cmd")

  if (!cmd) {
    return NextResponse.json({ error: "Missing cmd parameter" }, { status: 400 })
  }

  const portalUrl = process.env.STALKER_PORTAL_URL
  const mac = process.env.STALKER_MAC

  if (!portalUrl || !mac) {
    return NextResponse.json(
      { error: "Stalker portal not configured. Set STALKER_PORTAL_URL and STALKER_MAC environment variables." },
      { status: 500 },
    )
  }

  try {
    const client = new StalkerPortalClient({ portalUrl, mac })
    const result = await client.getStreamUrl(cmd)

    if (!result) {
      return NextResponse.json({ error: "Failed to resolve stream" }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      headers: result.headers,
    })
  } catch (error) {
    console.error("[v0] Stalker stream error:", error)

    if (error instanceof Error && error.message === "IP_BLOCKED") {
      return NextResponse.json({ error: "IP blocked by portal" }, { status: 403 })
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
