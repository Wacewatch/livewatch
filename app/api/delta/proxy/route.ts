import { NextRequest, NextResponse } from "next/server"
import { DeltaClient } from "@/lib/delta-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Delta Proxy - Proxies HLS streams from Delta
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("id")
  const path = searchParams.get("path") || "index.m3u8"

  console.log("[v0] Delta proxy request - channelId:", channelId, "path:", path)

  if (!channelId) {
    return new NextResponse("Missing channel ID", { status: 400 })
  }

  try {
    const deltaClient = new DeltaClient()

    // Get signature
    const sig = await deltaClient.getAddonSig()
    if (!sig) {
      console.error("[v0] Delta: Failed to get signature")
      return new NextResponse("Failed to authenticate", { status: 500 })
    }

    // Fetch catalog to find channel
    const allChannels = await deltaClient.fetchCatalog(sig)
    const channel = deltaClient.getChannelById(allChannels, channelId)
    
    if (!channel) {
      console.error("[v0] Delta: Channel not found:", channelId)
      return new NextResponse("Channel not found", { status: 404 })
    }

    // Resolve channel URL to get stream URL
    const streamUrl = await deltaClient.resolveChannel(channel.url, sig)
    if (!streamUrl) {
      console.error("[v0] Delta: Failed to resolve stream URL")
      return new NextResponse("Stream not available", { status: 404 })
    }

    console.log("[v0] Delta: Stream URL resolved:", streamUrl)

    // If requesting manifest, fetch and rewrite it
    if (path.endsWith(".m3u8")) {
      const manifestResponse = await fetch(streamUrl, {
        headers: {
          "User-Agent": "VAVOO/3.1.8",
          "Referer": "https://vavoo.to/",
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!manifestResponse.ok) {
        console.error("[v0] Delta: Failed to fetch manifest:", manifestResponse.status)
        return new NextResponse("Failed to fetch manifest", { status: manifestResponse.status })
      }

      let manifestContent = await manifestResponse.text()
      console.log("[v0] Delta: Manifest fetched, length:", manifestContent.length)

      // Rewrite URLs in manifest to go through our proxy
      const lines = manifestContent.split("\n")
      const rewrittenLines = lines.map((line) => {
        // Skip comments and empty lines
        if (line.startsWith("#") || !line.trim()) {
          return line
        }

        // If it's a relative URL or full URL, rewrite it
        if (line.includes(".m3u8") || line.includes(".ts")) {
          // If it's already a full URL, proxy it
          if (line.startsWith("http")) {
            const encodedUrl = encodeURIComponent(line)
            return `/api/delta/proxy?id=${encodeURIComponent(channelId)}&url=${encodedUrl}`
          }
          // If it's relative, resolve it relative to the stream URL
          const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf("/") + 1)
          const fullUrl = baseUrl + line
          const encodedUrl = encodeURIComponent(fullUrl)
          return `/api/delta/proxy?id=${encodeURIComponent(channelId)}&url=${encodedUrl}`
        }

        return line
      })

      manifestContent = rewrittenLines.join("\n")

      return new NextResponse(manifestContent, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    // If requesting a specific URL (segment), proxy it
    const urlParam = searchParams.get("url")
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam)
      console.log("[v0] Delta: Proxying segment:", decodedUrl.substring(0, 100))

      const segmentResponse = await fetch(decodedUrl, {
        headers: {
          "User-Agent": "VAVOO/3.1.8",
          "Referer": "https://vavoo.to/",
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!segmentResponse.ok) {
        console.error("[v0] Delta: Failed to fetch segment:", segmentResponse.status)
        return new NextResponse("Failed to fetch segment", { status: segmentResponse.status })
      }

      const segmentData = await segmentResponse.arrayBuffer()
      
      return new NextResponse(segmentData, {
        status: 200,
        headers: {
          "Content-Type": segmentResponse.headers.get("Content-Type") || "video/MP2T",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }

    // Default: return the stream URL directly
    return new NextResponse(streamUrl, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Delta proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
