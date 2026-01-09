import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function encodeUrl(url: string): string {
  return encodeURIComponent(url)
}

function decodeUrl(encoded: string): string {
  return decodeURIComponent(encoded)
}

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

const cdnUrlCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_TTL = 30000 // 30 secondes

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const resolvedParams = await params
  const path = resolvedParams.path.join("/")

  try {
    let targetUrl: string

    if (path.startsWith("play/")) {
      const cacheKey = path
      const cached = cdnUrlCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // Utiliser l'URL CDN cachée
        const cdnResponse = await fetch(cached.url, {
          method: "GET",
          headers: BROWSER_HEADERS,
          redirect: "follow",
        })

        if (cdnResponse.ok) {
          const content = await cdnResponse.text()
          if (content.startsWith("#EXTM3U")) {
            const rewrittenContent = rewriteM3U8(content, cdnResponse.url || cached.url, request.nextUrl.origin)
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
        }
        // Cache invalide, continuer avec une nouvelle requête
        cdnUrlCache.delete(cacheKey)
      }

      targetUrl = `https://vavoo.to/${path}`

      const vavooResponse = await fetch(targetUrl, {
        method: "GET",
        headers: VAVOO_HEADERS,
        redirect: "manual",
      })

      if (vavooResponse.status === 302 || vavooResponse.status === 301) {
        const cdnUrl = vavooResponse.headers.get("location")

        if (!cdnUrl) {
          return NextResponse.json({ error: "No redirect location from vavoo.to" }, { status: 502 })
        }

        cdnUrlCache.set(cacheKey, { url: cdnUrl, timestamp: Date.now() })

        const cdnResponse = await fetch(cdnUrl, {
          method: "GET",
          headers: BROWSER_HEADERS,
          redirect: "follow",
        })

        if (!cdnResponse.ok) {
          const errorText = await cdnResponse.text()
          return NextResponse.json(
            { error: `CDN error: ${cdnResponse.status}`, details: errorText.substring(0, 200) },
            { status: cdnResponse.status },
          )
        }

        const content = await cdnResponse.text()

        if (content.includes("Unavailable") || content.length < 20) {
          return NextResponse.json(
            { error: "Stream unavailable from CDN", content: content.substring(0, 100) },
            { status: 503 },
          )
        }

        if (!content.startsWith("#EXTM3U")) {
          return NextResponse.json(
            { error: "Invalid M3U8 content", preview: content.substring(0, 200) },
            { status: 502 },
          )
        }

        const rewrittenContent = rewriteM3U8(content, cdnResponse.url || cdnUrl, request.nextUrl.origin)

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

      const content = await vavooResponse.text()

      if (content.startsWith("#EXTM3U")) {
        const rewrittenContent = rewriteM3U8(content, targetUrl, request.nextUrl.origin)
        return new NextResponse(rewrittenContent, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        })
      }

      return NextResponse.json(
        {
          error: "Unexpected vavoo response",
          status: vavooResponse.status,
          preview: content.substring(0, 200),
        },
        { status: 502 },
      )
    } else if (path.startsWith("url/")) {
      const encodedUrl = path.substring(4)
      try {
        targetUrl = decodeUrl(encodedUrl)
      } catch {
        return NextResponse.json({ error: "Invalid encoded URL" }, { status: 400 })
      }

      const isSegment =
        targetUrl.endsWith(".ts") ||
        targetUrl.endsWith(".aac") ||
        targetUrl.endsWith(".m4s") ||
        targetUrl.includes("/seg-") ||
        targetUrl.includes("_seg")

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: BROWSER_HEADERS,
        redirect: "follow",
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: `Fetch error: ${response.status}`, details: errorText.substring(0, 200) },
          { status: response.status },
        )
      }

      const contentType = response.headers.get("content-type") || ""

      if (
        isSegment ||
        contentType.includes("video/") ||
        contentType.includes("audio/") ||
        contentType.includes("octet-stream") ||
        contentType.includes("mp2t")
      ) {
        // Stream directement le corps de la réponse
        return new NextResponse(response.body, {
          status: 200,
          headers: {
            "Content-Type": contentType || "video/mp2t",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60",
          },
        })
      }

      // Text content (M3U8)
      const content = await response.text()

      if (content.startsWith("#EXTM3U") || content.includes("#EXTINF") || content.includes("#EXT-X-")) {
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1)
        const rewrittenContent = rewriteM3U8(content, baseUrl, request.nextUrl.origin)
        return new NextResponse(rewrittenContent, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        })
      }

      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": contentType || "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } else {
      return NextResponse.json({ error: "Invalid path format" }, { status: 400 })
    }
  } catch (error) {
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

    if (trimmed.startsWith("#") || trimmed === "") {
      return line
    }

    try {
      let absoluteUrl: string

      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        absoluteUrl = trimmed
      } else if (trimmed.startsWith("/")) {
        const baseUrlObj = new URL(baseUrl)
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${trimmed}`
      } else {
        const base = baseUrl.endsWith("/") ? baseUrl : baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1)
        absoluteUrl = new URL(trimmed, base).href
      }

      return `${origin}/api/proxy/url/${encodeUrl(absoluteUrl)}`
    } catch {
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
