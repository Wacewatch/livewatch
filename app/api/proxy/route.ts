import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const VAVOO_HEADERS = {
  "User-Agent": "VAVOO/2.6",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
  }

  try {
    console.log("[v0] Proxying URL:", url)

    // Determine if this is a video segment
    const isSegment =
      url.endsWith(".ts") ||
      url.endsWith(".aac") ||
      url.endsWith(".m4s") ||
      url.includes("/seg-") ||
      url.includes("_seg")

    const response = await fetch(url, {
      method: "GET",
      headers: BROWSER_HEADERS,
      redirect: "follow",
    })

    if (!response.ok) {
      console.error("[v0] Fetch error:", response.status, url)
      return NextResponse.json({ error: `Fetch error: ${response.status}` }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || ""

    // Handle video/audio segments - stream directly
    if (
      isSegment ||
      contentType.includes("video/") ||
      contentType.includes("audio/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("mp2t")
    ) {
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": contentType || "video/mp2t",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    // Handle M3U8 playlists - rewrite URLs
    const content = await response.text()

    if (content.startsWith("#EXTM3U") || content.includes("#EXTINF") || content.includes("#EXT-X-")) {
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)
      const rewrittenContent = rewriteM3U8(content, baseUrl, request.nextUrl.origin)

      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    // Other content types
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType || "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Proxy error:", error)
    return NextResponse.json(
      { error: "Proxy error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

function rewriteM3U8(content: string, baseUrl: string, origin: string): string {
  const lines = content.split("\n")
  const rewrittenLines = lines.map((line) => {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (trimmed.startsWith("#") || trimmed === "") {
      return line
    }

    try {
      let absoluteUrl: string

      // Handle absolute URLs
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        absoluteUrl = trimmed
      }
      // Handle absolute paths
      else if (trimmed.startsWith("/")) {
        const baseUrlObj = new URL(baseUrl)
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${trimmed}`
      }
      // Handle relative URLs
      else {
        const base = baseUrl.endsWith("/") ? baseUrl : baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1)
        absoluteUrl = new URL(trimmed, base).href
      }

      // Return proxy URL with query parameter
      return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`
    } catch (error) {
      console.error("[v0] Failed to rewrite URL:", trimmed, error)
      return line
    }
  })

  return rewrittenLines.join("\n")
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
