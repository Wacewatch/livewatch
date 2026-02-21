import { NextRequest } from "next/server"
import { DeltaClient } from "@/lib/delta-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Delta Stream Proxy - exactly like PHP VAVOO proxyStream
 * This proxies both HLS manifests and segments
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("id")
  const url = searchParams.get("url")

  console.log("[v0] Delta proxy-stream - channelId:", channelId, "url:", url?.substring(0, 100))

  try {
    let streamUrl = url

    // If no direct URL, resolve from channel ID
    if (!streamUrl && channelId) {
      const deltaClient = new DeltaClient()
      const sig = await deltaClient.getAddonSig()
      if (!sig) {
        return new Response("Auth failed", { status: 500 })
      }

      const catalog = await deltaClient.fetchCatalog(sig)
      const channel = deltaClient.getChannelById(catalog, channelId)
      if (!channel) {
        return new Response("Channel not found", { status: 404 })
      }

      streamUrl = await deltaClient.resolveChannel(channel.url, sig)
      if (!streamUrl) {
        return new Response("Stream unavailable", { status: 404 })
      }

      console.log("[v0] Delta resolved stream URL:", streamUrl.substring(0, 100))
    }

    if (!streamUrl) {
      return new Response("Missing URL", { status: 400 })
    }

    // Check if it's an HLS manifest
    if (streamUrl.toLowerCase().includes(".m3u8")) {
      return proxyHLSManifest(streamUrl, channelId || "")
    }

    // Otherwise, proxy as direct stream (exactly like PHP)
    return proxyDirectStream(streamUrl)
  } catch (error) {
    console.error("[v0] Delta proxy-stream error:", error)
    return new Response("Proxy error", { status: 502 })
  }
}

/**
 * Proxy HLS Manifest - rewrites URLs to point to our proxy
 */
async function proxyHLSManifest(m3u8Url: string, channelId: string): Promise<Response> {
  try {
    console.log("[v0] Delta fetching HLS manifest:", m3u8Url.substring(0, 100))

    const response = await fetch(m3u8Url, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        "Referer": "https://vavoo.to/",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error("[v0] Delta manifest fetch failed:", response.status)
      return new Response("#EXTM3U\n#EXT-X-ERROR", {
        status: 502,
        headers: { "Content-Type": "application/vnd.apple.mpegurl" },
      })
    }

    const manifest = await response.text()
    console.log("[v0] Delta manifest fetched, size:", manifest.length)

    // Get base URL for relative paths
    const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/"))
    const selfUrl = "/api/delta/proxy-stream"

    const lines = manifest.split("\n")
    const rewrittenLines: string[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Keep comments and empty lines as-is
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        rewrittenLines.push(trimmedLine)
        continue
      }

      // Rewrite segment/playlist URLs
      let absoluteUrl: string
      if (trimmedLine.match(/^https?:\/\//)) {
        // Already absolute
        absoluteUrl = trimmedLine
      } else {
        // Relative path - make absolute
        absoluteUrl = `${baseUrl}/${trimmedLine.replace(/^\//, "")}`
      }

      // Rewrite to go through our proxy
      const proxiedUrl = `${selfUrl}?url=${encodeURIComponent(absoluteUrl)}&id=${encodeURIComponent(channelId)}`
      rewrittenLines.push(proxiedUrl)
    }

    const rewrittenManifest = rewrittenLines.join("\n")

    return new Response(rewrittenManifest, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[v0] Delta manifest proxy error:", error)
    return new Response("#EXTM3U\n#EXT-X-ERROR", {
      status: 502,
      headers: { "Content-Type": "application/vnd.apple.mpegurl" },
    })
  }
}

/**
 * Proxy Direct Stream - streams video data directly (exactly like PHP)
 */
async function proxyDirectStream(url: string): Promise<Response> {
  try {
    console.log("[v0] Delta proxying direct stream:", url.substring(0, 100))

    const response = await fetch(url, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        "Referer": "https://vavoo.to/",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error("[v0] Delta stream fetch failed:", response.status)
      return new Response("Stream unavailable", { status: response.status })
    }

    // Determine content type
    let contentType = response.headers.get("Content-Type") || "video/mp2t"
    if (url.toLowerCase().includes(".ts")) {
      contentType = "video/mp2t"
    } else if (url.toLowerCase().includes(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl"
    }

    // Stream the response
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": url.includes(".ts") ? "public, max-age=31536000, immutable" : "no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] Delta stream proxy error:", error)
    return new Response("Stream error", { status: 502 })
  }
}
