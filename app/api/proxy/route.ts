import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    // Augmenter le timeout à 60 secondes
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    // Récupérer les headers Range de la requête originale
    const rangeHeader = request.headers.get("range")
    
    const headers: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Referer": "https://tvvoo.live/",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Origin": "https://tvvoo.live",
    }

    // Ajouter le header Range si présent
    if (rangeHeader) {
      headers["Range"] = rangeHeader
    }

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch: ${response.statusText}`,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type") || ""
    const isM3U8 = contentType.includes("mpegurl") || url.includes(".m3u8") || contentType.includes("x-mpegURL")

    if (isM3U8) {
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
          // Augmenter le cache du manifeste à 5 secondes
          "Cache-Control": "public, max-age=5",
        },
      })
    }

    const isSegment = url.includes(".ts") || contentType.includes("video/mp2t")

    if (isSegment && response.body) {
      const responseHeaders: HeadersInit = {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        // Cache plus long pour les segments (1 heure)
        "Cache-Control": "public, max-age=3600, immutable",
        "Accept-Ranges": "bytes",
      }

      // Transférer les headers importants de la réponse
      const contentLength = response.headers.get("content-length")
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength
      }

      const contentRange = response.headers.get("content-range")
      if (contentRange) {
        responseHeaders["Content-Range"] = contentRange
      }

      // Utiliser le bon status code pour les range requests
      const status = response.status === 206 ? 206 : 200

      // Stream la réponse directement
      return new NextResponse(response.body, {
        status,
        headers: responseHeaders,
      })
    }

    // Fallback pour autres types de contenu
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

    return NextResponse.json(
      {
        error: isTimeout ? "Request timeout" : "Failed to fetch stream",
        details: errorMessage,
      },
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
    },
  })
}
