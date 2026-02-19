import { type NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Naga Proxy Stream - Exact replica of PHP proxyStream() function
 * Handles both HLS (.m3u8) and direct streams
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")
  const name = searchParams.get("name") || ""

  if (!url) {
    return new Response("Missing URL parameter", { status: 400 })
  }

  try {
    // Check if it's an HLS manifest
    if (url.toLowerCase().includes(".m3u8")) {
      return proxyHLSManifest(url, request)
    }

    // Proxy direct stream (same as PHP)
    return proxyDirectStream(url, name)
  } catch (error) {
    console.error("[v0] Naga proxy error:", error)
    return new Response("Proxy error", { status: 502 })
  }
}

/**
 * Proxy HLS manifest - exact replica of PHP proxyHLSManifest()
 */
async function proxyHLSManifest(m3u8Url: string, request: NextRequest): Promise<Response> {
  try {
    // Fetch the manifest
    const response = await fetch(m3u8Url, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        Referer: "https://vavoo.to/",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return new Response("#EXTM3U\n#EXT-X-ERROR: Failed to fetch manifest", {
        status: 502,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    const manifest = await response.text()

    // Get base URL for relative paths
    const base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/"))

    // Get current request URL for rewriting
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const host = request.headers.get("host") || ""
    const selfUrl = `${protocol}://${host}/api/naga/proxy`

    // Process manifest line by line
    const lines = manifest.split("\n")
    const processedLines: string[] = []

    for (let line of lines) {
      line = line.trim()

      // Keep comments and empty lines
      if (!line || line.startsWith("#")) {
        processedLines.push(line)
        continue
      }

      // Rewrite segment URLs
      let absoluteUrl: string
      if (line.match(/^https?:\/\//)) {
        // Already absolute
        absoluteUrl = line
      } else {
        // Make relative URL absolute
        absoluteUrl = `${base}/${line.replace(/^\//, "")}`
      }

      // Rewrite to proxy through our HLS segment endpoint
      const proxiedUrl = `${selfUrl}?action=hls_segment&url=${encodeURIComponent(absoluteUrl)}`
      processedLines.push(proxiedUrl)
    }

    return new Response(processedLines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Naga HLS manifest error:", error)
    return new Response("#EXTM3U\n#EXT-X-ERROR: Proxy error", {
      status: 502,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}

/**
 * Proxy HLS segment - exact replica of PHP proxyHLSSegment()
 */
async function proxyHLSSegment(segUrl: string): Promise<Response> {
  try {
    const response = await fetch(segUrl, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        Referer: "https://vavoo.to/",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      return new Response("Segment not available", { status: 502 })
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Naga HLS segment error:", error)
    return new Response("Segment error", { status: 502 })
  }
}

/**
 * Proxy direct stream - exact replica of PHP proxyStream()
 */
async function proxyDirectStream(url: string, name: string): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VAVOO/3.1.8",
        Referer: "https://vavoo.to/",
        Accept: "*/*",
      },
    })

    if (!response.ok) {
      return new Response("Stream not available", { status: 502 })
    }

    // Stream the response body
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Naga direct stream error:", error)
    return new Response("Stream error", { status: 502 })
  }
}

/**
 * Handle HLS segment requests
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")
  const url = searchParams.get("url")

  if (action === "hls_segment" && url) {
    return proxyHLSSegment(url)
  }

  return new Response("Invalid request", { status: 400 })
}
