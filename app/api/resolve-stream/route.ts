import { type NextRequest, NextResponse } from "next/server"
import { VavooClient } from "@/lib/vavoo-client"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")
  const type = searchParams.get("type") || "vavoo" // "vavoo" or "stalker"

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 })
  }

  try {
    console.log("[v0] Resolving stream for URL:", url)

    if (type === "stalker") {
      // Stalker portal stream resolution
      return await resolveStalkerStream(url)
    } else {
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
    }
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

async function resolveStalkerStream(cmd: string) {
  // Stalker portal configuration
  const portalUrl = process.env.STALKER_PORTAL_URL || ""
  const mac = process.env.STALKER_MAC || ""

  if (!portalUrl || !mac) {
    return NextResponse.json(
      {
        success: false,
        error: "Stalker portal not configured",
      },
      { status: 500 },
    )
  }

  try {
    // Get or create Stalker session
    const token = await getStalkerToken(portalUrl, mac)

    // Get stream URL from Stalker portal
    const streamUrl = await getStalkerStreamUrl(portalUrl, mac, token, cmd)

    if (streamUrl) {
      // Verify the stream is accessible
      const isAccessible = await verifyStreamUrl(streamUrl)

      if (isAccessible) {
        console.log("[v0] Resolved Stalker stream URL:", streamUrl.substring(0, 100))
        return NextResponse.json({
          success: true,
          cdnUrl: streamUrl,
          type: "stalker",
          headers: {
            "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3",
            Referer: portalUrl,
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Stalker stream not accessible",
      },
      { status: 502 },
    )
  } catch (error) {
    console.error("[v0] Stalker resolution error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to resolve Stalker stream",
      },
      { status: 500 },
    )
  }
}

async function getStalkerToken(portalUrl: string, mac: string): Promise<string> {
  const baseUrl = portalUrl.replace("/c", "/server/load.php")

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 1812 Mobile Safari/533.3",
    Referer: portalUrl,
    "Accept-Language": "en-US,en;q=0.5",
    "X-User-Agent": "Model: MAG250; Link: WiFi",
    Cookie: `mac=${encodeURIComponent(mac)}; stb_lang=en; timezone=${encodeURIComponent("Europe/Paris")}`,
  }

  // Handshake to get token
  const handshakeParams = new URLSearchParams({
    type: "stb",
    action: "handshake",
    JsHttpRequest: "1-xml",
  })

  const handshakeResponse = await fetch(`${baseUrl}?${handshakeParams}`, {
    headers,
  })

  const handshakeData = await handshakeResponse.text()
  const parsed = JSON.parse(handshakeData)

  return parsed.js?.token || ""
}

async function getStalkerStreamUrl(portalUrl: string, mac: string, token: string, cmd: string): Promise<string | null> {
  const baseUrl = portalUrl.replace("/c", "/server/load.php")

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 1812 Mobile Safari/533.3",
    Referer: portalUrl,
    "Accept-Language": "en-US,en;q=0.5",
    "X-User-Agent": "Model: MAG250; Link: WiFi",
    Authorization: `Bearer ${token}`,
    Cookie: `mac=${encodeURIComponent(mac)}; stb_lang=en; timezone=${encodeURIComponent("Europe/Paris")}; token=${encodeURIComponent(token)}`,
  }

  const params = new URLSearchParams({
    type: "itv",
    action: "create_link",
    cmd: cmd,
    JsHttpRequest: "1-xml",
  })

  const response = await fetch(`${baseUrl}?${params}`, {
    headers,
  })

  const data = await response.text()
  const parsed = JSON.parse(data)

  if (parsed.js?.cmd) {
    // Extract URL from command
    const cmdParts = parsed.js.cmd.split(" ")
    return cmdParts[cmdParts.length - 1]
  }

  return null
}

async function verifyStreamUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(5000),
    })

    return response.ok && response.status < 400
  } catch {
    return false
  }
}
