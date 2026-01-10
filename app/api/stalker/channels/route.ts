import { NextResponse } from "next/server"
import { StalkerPortalClient } from "@/lib/stalker-client"

export async function GET() {
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
    const channels = await client.getChannels()

    return NextResponse.json({
      success: true,
      channels,
    })
  } catch (error) {
    console.error("[v0] Stalker channels error:", error)

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
