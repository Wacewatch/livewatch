import { NextRequest, NextResponse } from "next/server"
import { getAddonSig, fetchCatalog, resolveChannel } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 60

const VAVOO_HEADERS = {
  "User-Agent": "VAVOO/3.0",
  "Accept": "*/*",
  "Connection": "keep-alive",
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  try {
    const { id, path } = params
    const filePath = path.join("/")
    
    console.log("[v0] Delta proxy: id=", id, "path=", filePath)

    // Step 1: Get token
    const sig = await getAddonSig()
    if (!sig) {
      return NextResponse.json({ error: "No token" }, { status: 503 })
    }

    // Step 2: Get channel from catalog
    const catalog = await fetchCatalog(sig)
    const channel = catalog.find((ch) => ch.id === id)
    
    if (!channel || !channel.url) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Step 3: Resolve channel URL to get stream URL
    const streamUrl = await resolveChannel(channel.url, sig)
    if (!streamUrl) {
      return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 })
    }

    console.log("[v0] Delta proxy: Stream resolved")

    // Step 4: Proxy the HLS content
    if (filePath === "index.m3u8" || filePath.endsWith(".m3u8")) {
      // This is a manifest file
      const manifestUrl = filePath === "index.m3u8" ? streamUrl : `${streamUrl.split("/").slice(0, -1).join("/")}/${filePath}`
      
      console.log("[v0] Delta proxy: Fetching manifest:", manifestUrl)
      
      const manifestRes = await fetch(manifestUrl, {
        headers: VAVOO_HEADERS,
        signal: AbortSignal.timeout(20000),
      })

      if (!manifestRes.ok) {
        throw new Error(`Manifest fetch failed: ${manifestRes.status}`)
      }

      let manifestContent = await manifestRes.text()

      // Rewrite URLs in manifest to point back to our proxy
      const baseUrl = streamUrl.split("/").slice(0, -1).join("/")
      manifestContent = manifestContent
        .split("\n")
        .map((line) => {
          if (line && !line.startsWith("#")) {
            // This is a URL line
            if (line.startsWith("http")) {
              // Absolute URL - extract just the filename
              const filename = line.split("/").pop()
              return `/api/delta/proxy/play/${id}/${filename}`
            } else {
              // Relative URL
              return `/api/delta/proxy/play/${id}/${line}`
            }
          }
          return line
        })
        .join("\n")

      return new NextResponse(manifestContent, {
        headers: {
          "Content-Type": manifestRes.headers.get("Content-Type") || "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } else {
      // This is a segment file (.ts, .aac, etc.)
      const segmentUrl = `${streamUrl.split("/").slice(0, -1).join("/")}/${filePath}`
      
      console.log("[v0] Delta proxy: Fetching segment:", segmentUrl.substring(0, 100))

      const segmentRes = await fetch(segmentUrl, {
        headers: VAVOO_HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!segmentRes.ok) {
        throw new Error(`Segment fetch failed: ${segmentRes.status}`)
      }

      const segmentData = await segmentRes.arrayBuffer()

      return new NextResponse(segmentData, {
        headers: {
          "Content-Type": segmentRes.headers.get("Content-Type") || "video/MP2T",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }
  } catch (error: any) {
    console.error("[v0] Delta proxy error:", error.message)
    return NextResponse.json(
      { error: "Proxy error", details: error.message },
      { status: 500 }
    )
  }
}
