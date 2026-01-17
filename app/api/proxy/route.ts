import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge" // Utilise Edge Runtime pour de meilleures performances
export const preferredRegion = "auto"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    const headers: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: "https://tvvoo.live/",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br", // Accepter la compression
      Origin: "https://tvvoo.live",
      Connection: "keep-alive",
    }

    const rangeHeader = request.headers.get("Range")
    if (rangeHeader) {
      headers["Range"] = rangeHeader
    }

    const controller = new AbortController()
    const isSegment = url.includes(".ts") || url.includes(".aac") || url.includes(".mp4")
    const timeoutMs = isSegment ? 15000 : 30000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: isSegment ? "default" : "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || ""

    // Traitement des manifests M3U8
    if (contentType.includes("mpegurl") || url.includes(".m3u8") || contentType.includes("x-mpegURL")) {
      const text = await response.text()

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
          "Access-Control-Allow-Headers": "Content-Type, Range",
          "Cache-Control": "no-cache",
        },
      })
    }

    // Utilise le body stream directement au lieu d'attendre tout le contenu
    const responseHeaders: HeadersInit = {
      "Content-Type": contentType || "video/mp2t",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Accept-Ranges": "bytes",
    }

    if (isSegment) {
      responseHeaders["Cache-Control"] = "public, max-age=300" // Cache 5 minutes
    }

    // Copier les headers de content-length et range si présents
    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength
    }

    const contentRange = response.headers.get("content-range")
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isTimeout = errorMessage.includes("aborted") || errorMessage.includes("timeout")

    return NextResponse.json(
      { error: isTimeout ? "Request timeout" : "Failed to fetch stream" },
      { status: isTimeout ? 504 : 500 },
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
      "Access-Control-Max-Age": "86400",
    },
  })
}
