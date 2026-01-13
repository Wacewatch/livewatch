import { type NextRequest, NextResponse } from "next/server"

// External proxy for second source: https://proxiesembed.movix.club/proxy?url=
const EXTERNAL_PROXY_BASE = "https://proxiesembed.movix.club/proxy?url="

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    console.error("[v0] External proxy error: URL parameter missing")
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    console.log("[v0] External proxy request for:", url)

    // Build the external proxy URL
    const proxyUrl = `${EXTERNAL_PROXY_BASE}${encodeURIComponent(url)}`
    console.log("[v0] Using external proxy:", proxyUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        "Accept-Encoding": "identity",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("[v0] External proxy fetch failed:", {
        url: url,
        proxyUrl: proxyUrl,
        status: response.status,
        statusText: response.statusText,
      })
      return NextResponse.json(
        {
          error: `Failed to fetch: ${response.statusText}`,
          status: response.status,
          url: url,
        },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type") || ""

    // Handle M3U8 manifest - rewrite URLs to use this external proxy
    if (contentType.includes("mpegurl") || url.includes(".m3u8") || contentType.includes("x-mpegURL")) {
      const text = await response.text()
      console.log("[v0] Rewriting M3U8 manifest for external proxy")

      const baseUrl = new URL(url)
      const baseUrlStr = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf("/") + 1)

      const rewrittenManifest = text
        .split("\n")
        .map((line) => {
          if (line.startsWith("#") || line.trim() === "") {
            return line
          }

          if (line.trim().length > 0 && !line.startsWith("#")) {
            let absoluteUrl = line.trim()

            if (!absoluteUrl.startsWith("http://") && !absoluteUrl.startsWith("https://")) {
              absoluteUrl = baseUrlStr + absoluteUrl
            }

            // Use this external proxy endpoint for .ts segments too
            return `/api/proxy-external?url=${encodeURIComponent(absoluteUrl)}`
          }

          return line
        })
        .join("\n")

      console.log("[v0] M3U8 manifest rewritten for external proxy")

      return new NextResponse(rewrittenManifest, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-cache",
        },
      })
    }

    // For .ts segments and other binary data
    const data = await response.arrayBuffer()

    console.log("[v0] External proxy successful:", {
      contentType: contentType,
      size: data.byteLength,
      url: url.substring(0, 100),
    })

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] External proxy error:", {
      url: url,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: "Failed to fetch stream via external proxy",
        details: error instanceof Error ? error.message : String(error),
        url: url,
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
