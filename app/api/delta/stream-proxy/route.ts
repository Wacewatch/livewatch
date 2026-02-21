import { NextRequest, NextResponse } from "next/server"
import { getAddonSig, resolveChannel } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Delta Stream Proxy - EXACT implementation of PHP proxy logic
 * Handles: resolve, manifest rewriting, and segment proxying
 */

function getSelfBase(req: NextRequest): string {
  const host = req.headers.get("host") || ""
  const protocol = req.headers.get("x-forwarded-proto") || "https"
  return `${protocol}://${host}/api/delta/stream-proxy`
}

/**
 * Proxy HLS manifest - rewrites URLs to point back to our proxy
 */
async function proxyHLSManifest(m3u8Url: string, selfUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(m3u8Url, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        Referer: "https://vavoo.to/",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error("[v0] Delta: Manifest fetch failed:", response.status)
      return new NextResponse("#EXTM3U\n#EXT-X-ENDLIST\n", {
        status: 502,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    const manifest = await response.text()
    const base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/"))
    const lines = manifest.split("\n")
    const processedLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      // Pass through comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        processedLines.push(line)
        continue
      }

      // Rewrite segment/playlist URLs
      let absoluteUrl: string
      if (trimmed.match(/^https?:\/\//)) {
        absoluteUrl = trimmed
      } else {
        absoluteUrl = `${base}/${trimmed.replace(/^\//, "")}`
      }

      // Point to our proxy
      const proxiedUrl = `${selfUrl}?action=segment&url=${encodeURIComponent(absoluteUrl)}`
      processedLines.push(proxiedUrl)
    }

    return new NextResponse(processedLines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=5",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Delta: Manifest proxy error:", error)
    return new NextResponse("#EXTM3U\n#EXT-X-ENDLIST\n", {
      status: 502,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}

/**
 * Proxy HLS segment - streams video segment with proper headers
 */
async function proxyHLSSegment(segUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(segUrl, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        Referer: "https://vavoo.to/",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error("[v0] Delta: Segment fetch failed:", response.status)
      return new NextResponse(null, { status: response.status })
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Cache-Control": "public, max-age=3600, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Delta: Segment proxy error:", error)
    return new NextResponse(null, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
      },
    })
  }

  try {
    if (action === "resolve") {
      // Resolve channel URL to stream URL
      const channelUrl = searchParams.get("url")
      if (!channelUrl) {
        return NextResponse.json({ error: "Missing url" }, { status: 400 })
      }

      console.log("[v0] Delta: Resolving channel URL")

      const sig = await getAddonSig()
      if (!sig) {
        console.error("[v0] Delta: No signature available")
        return NextResponse.json({ error: "No token" }, { status: 503 })
      }

      const streamUrl = await resolveChannel(channelUrl, sig)
      if (!streamUrl) {
        console.error("[v0] Delta: Could not resolve stream")
        return NextResponse.json({ error: "Could not resolve" }, { status: 404 })
      }

      console.log("[v0] Delta: Resolved to stream URL")
      return NextResponse.json({ stream_url: streamUrl })
    } else if (action === "pipe") {
      // Proxy the stream (manifest or direct)
      const url = searchParams.get("url")
      if (!url) {
        return new NextResponse("Missing url", { status: 400 })
      }

      const selfUrl = getSelfBase(req)

      // If it's an M3U8 manifest, rewrite it
      if (url.toLowerCase().includes(".m3u8")) {
        console.log("[v0] Delta: Proxying HLS manifest")
        return proxyHLSManifest(url, selfUrl)
      } else {
        // Direct stream (rare, but handle it)
        console.log("[v0] Delta: Proxying direct stream")
        return proxyHLSSegment(url)
      }
    } else if (action === "segment") {
      // Proxy a segment
      const url = searchParams.get("url")
      if (!url) {
        return new NextResponse("Missing url", { status: 400 })
      }

      return proxyHLSSegment(url)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Delta stream proxy error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
