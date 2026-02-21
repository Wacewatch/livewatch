import { NextRequest, NextResponse } from "next/server"
import { getAddonSig, resolveChannel } from "@/lib/delta-client-v2"

export const runtime = "nodejs"
export const maxDuration = 300

// This endpoint mimics the PHP proxy behavior exactly
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")
  const url = searchParams.get("url")
  const channelUrl = searchParams.get("channelUrl")

  console.log("[v0] Delta Proxy:", { action, hasUrl: !!url, hasChannelUrl: !!channelUrl })

  try {
    // ?action=resolve&channelUrl=...  (PHP equivalent)
    if (action === "resolve" && channelUrl) {
      const sig = await getAddonSig()
      if (!sig) {
        return NextResponse.json({ error: "No token" }, { status: 503 })
      }

      const streamUrl = await resolveChannel(channelUrl, sig)
      if (!streamUrl) {
        return NextResponse.json({ error: "Could not resolve" }, { status: 404 })
      }

      return NextResponse.json({ stream_url: streamUrl })
    }

    // ?action=pipe&url=...  (PHP equivalent)
    if (action === "pipe" && url) {
      const isM3U8 = url.toLowerCase().includes(".m3u8")

      const streamResponse = await fetch(url, {
        headers: {
          "User-Agent": "VAVOO/3.1.8",
          Referer: "https://vavoo.to/",
          Accept: "*/*",
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!streamResponse.ok) {
        console.error("[v0] Delta Proxy: Stream fetch failed:", streamResponse.status)
        return NextResponse.json({ error: "Stream unavailable" }, { status: 502 })
      }

      // If it's an HLS manifest, rewrite segment URLs
      if (isM3U8) {
        const manifest = await streamResponse.text()
        const baseUrl = url.substring(0, url.lastIndexOf("/"))
        const selfBase = new URL(request.url).origin + "/api/delta/proxy"

        const lines = manifest.split("\n")
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith("#")) return line

          // Make absolute URL
          const absoluteUrl = trimmed.match(/^https?:\/\//) ? trimmed : `${baseUrl}/${trimmed.replace(/^\//, "")}`

          // Rewrite to proxy through us
          return `${selfBase}?action=pipe&url=${encodeURIComponent(absoluteUrl)}`
        })

        return new NextResponse(rewrittenLines.join("\n"), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        })
      }

      // For segments, stream directly
      const headers = new Headers()
      headers.set("Content-Type", streamResponse.headers.get("Content-Type") || "video/mp2t")
      headers.set("Access-Control-Allow-Origin", "*")
      headers.set("Cache-Control": "no-cache")

      return new NextResponse(streamResponse.body, {
        status: 200,
        headers,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Delta Proxy error:", error)
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 })
  }
}
