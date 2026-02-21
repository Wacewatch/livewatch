import { NextRequest, NextResponse } from "next/server"
import { getAddonSig, fetchCatalog, resolveChannel } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 60

// Cache resolved streams to avoid resolving on every segment request
const streamCache = new Map<string, { url: string, timestamp: number }>()
const STREAM_CACHE_TTL = 300000 // 5 minutes

const VAVOO_HEADERS = {
  "User-Agent": "VAVOO/3.1.8",
  "Referer": "https://vavoo.to/",
  "Accept": "*/*",
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  try {
    const { id, path } = params
    const filePath = path.join("/")
    
    const now = Date.now()
    const cached = streamCache.get(id)
    let streamUrl: string

    // Use cached stream URL if available and not expired
    if (cached && (now - cached.timestamp) < STREAM_CACHE_TTL) {
      streamUrl = cached.url
      console.log("[v0] Delta: Using cached stream for", id)
    } else {
      // Need to resolve the stream
      console.log("[v0] Delta: Resolving stream for channel", id)
      
      const sig = await getAddonSig()
      if (!sig) {
        console.error("[v0] Delta: No token available")
        return NextResponse.json({ error: "No token" }, { status: 503 })
      }

      const catalog = await fetchCatalog(sig)
      console.log("[v0] Delta: Catalog loaded,", catalog.length, "channels")
      
      const channel = catalog.find((ch) => String(ch.id) === String(id))
      
      if (!channel) {
        console.error("[v0] Delta: Channel not found in catalog, ID:", id)
        return NextResponse.json({ error: "Channel not found" }, { status: 404 })
      }
      
      if (!channel.url) {
        console.error("[v0] Delta: Channel has no URL, ID:", id)
        return NextResponse.json({ error: "Channel has no URL" }, { status: 404 })
      }

      console.log("[v0] Delta: Resolving channel URL:", channel.url)
      const resolved = await resolveChannel(channel.url, sig)
      
      if (!resolved) {
        console.error("[v0] Delta: Failed to resolve channel URL")
        return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 })
      }

      streamUrl = resolved
      streamCache.set(id, { url: streamUrl, timestamp: now })
      console.log("[v0] Delta: Stream resolved and cached:", streamUrl)
    }

    // Handle manifest or segment
    if (filePath === "index.m3u8" || filePath.endsWith(".m3u8")) {
      // Manifest request
      const manifestUrl = filePath === "index.m3u8" ? streamUrl : `${streamUrl.split("/").slice(0, -1).join("/")}/${filePath}`
      
      const manifestRes = await fetch(manifestUrl, {
        headers: VAVOO_HEADERS,
        signal: AbortSignal.timeout(15000),
      })

      if (!manifestRes.ok) {
        throw new Error(`Manifest error: ${manifestRes.status}`)
      }

      let manifest = await manifestRes.text()

      // Rewrite URLs to point to our proxy
      manifest = manifest
        .split("\n")
        .map((line) => {
          if (line && !line.startsWith("#") && !line.startsWith("http")) {
            return `/api/delta/proxy/play/${id}/${line}`
          }
          return line
        })
        .join("\n")

      return new NextResponse(manifest, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } else {
      // Segment request (.ts file)
      const segmentUrl = `${streamUrl.split("/").slice(0, -1).join("/")}/${filePath}`

      const segmentRes = await fetch(segmentUrl, {
        headers: VAVOO_HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!segmentRes.ok) {
        return NextResponse.json({ error: "Segment error" }, { status: segmentRes.status })
      }

      const segmentData = await segmentRes.arrayBuffer()

      return new NextResponse(segmentData, {
        headers: {
          "Content-Type": "video/MP2T",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  } catch (error: any) {
    console.error("[v0] Delta proxy error:", error.message)
    return NextResponse.json({ error: "Proxy error" }, { status: 500 })
  }
}
