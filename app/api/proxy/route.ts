import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    console.error("[v0] Proxy error: URL parameter missing")
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    console.log("[v0] Proxying request to:", url.substring(0, 100))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    let response
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: new URL(url).origin,
          Accept: "*/*",
          "Accept-Encoding": "identity",
        },
        signal: controller.signal,
        cache: "no-store",
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error("[v0] Fetch error:", fetchError)
      throw fetchError
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("[v0] Proxy fetch failed:", {
        status: response.status,
        statusText: response.statusText,
      })
      return NextResponse.json(
        {
          error: `Failed to fetch: ${response.statusText}`,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type") || ""

    if (contentType.includes("mpegurl") || contentType.includes("x-mpegURL") || url.includes(".m3u8")) {
      const text = await response.text()
      console.log("[v0] Rewriting M3U8 manifest")

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

            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`
          }

          return line
        })
        .join("\n")

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

    const data = await response.arrayBuffer()

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[v0] Proxy error:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
    })

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "Request timeout - stream took too long to respond",
        },
        { status: 504 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to fetch stream",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
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
