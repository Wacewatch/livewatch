import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get("id")
  const path = searchParams.get("path") || "index.m3u8"

  if (!channelId) {
    return NextResponse.json({ error: "Channel ID parameter is required" }, { status: 400 })
  }

  const url = `https://vavoo.to/play/${channelId}/${path}`

  try {
    console.log("[v0] Proxying Vavoo stream:", url)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const rangeHeader = request.headers.get("range")

    const headers: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: "https://vavoo.to/",
      Origin: "https://vavoo.to",
      Accept: "*/*",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    }

    if (rangeHeader) {
      headers["Range"] = rangeHeader
    }

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("[v0] Vavoo stream error:", response.status, response.statusText)
      return NextResponse.json(
        {
          error: `Failed to fetch stream: ${response.statusText}`,
          status: response.status,
        },
        { status: response.status }
      )
    }

    const contentType = response.headers.get("content-type") || ""
    const isM3U8 =
      contentType.includes("mpegurl") || contentType.includes("x-mpegURL") || path.includes(".m3u8")

    if (isM3U8) {
      const text = await response.text()
      console.log("[v0] Rewriting Vavoo M3U8 playlist for channel:", channelId)

      const baseUrl = `https://vavoo.to/play/${channelId}/`

      const rewrittenManifest = text
        .split("\n")
        .map((line) => {
          if (line.startsWith("#") || line.trim() === "") {
            return line
          }

          if (line.trim().length > 0) {
            let absoluteUrl = line.trim()

            if (!absoluteUrl.startsWith("http://") && !absoluteUrl.startsWith("https://")) {
              if (absoluteUrl.startsWith("/")) {
                absoluteUrl = "https://vavoo.to" + absoluteUrl
              } else {
                absoluteUrl = baseUrl + absoluteUrl
              }
            }

            const proxiedPath = absoluteUrl.replace(`https://vavoo.to/play/${channelId}/`, "")
            return `/api/vavoo/proxy?id=${channelId}&path=${encodeURIComponent(proxiedPath)}`
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
          "Access-Control-Allow-Headers": "Content-Type, Range",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    const isSegment = path.includes(".ts") || contentType.includes("video/mp2t") || contentType.includes("video/MP2T")

    if (isSegment && response.body) {
      const responseHeaders: HeadersInit = {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      }

      const contentLength = response.headers.get("content-length")
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength
      }

      const contentRange = response.headers.get("content-range")
      if (contentRange) {
        responseHeaders["Content-Range"] = contentRange
      }

      const status = response.status === 206 ? 206 : 200

      return new NextResponse(response.body, {
        status,
        headers: responseHeaders,
      })
    }

    const data = await response.arrayBuffer()

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isTimeout = errorMessage.includes("aborted") || errorMessage.includes("timeout")

    console.error("[v0] Vavoo proxy error:", errorMessage)

    return NextResponse.json(
      {
        error: isTimeout ? "Request timeout" : "Failed to fetch stream",
        details: errorMessage,
      },
      { status: isTimeout ? 504 : 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  })
}
