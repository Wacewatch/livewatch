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
  const channel = searchParams.get("channel")
  const path = searchParams.get("path")

  // New mode: resolve channel stream first, then proxy
  if (channel) {
    try {
      // Import NagaClient dynamically
      const { NagaClient } = await import("@/lib/naga-client")
      const nagaClient = new NagaClient()

      // Get stream URL for this channel
      const stream = await nagaClient.resolveStream(channel)
      
      if (!stream || !stream.url) {
        return new Response("Channel stream not found", { status: 404 })
      }

      // If requesting the manifest
      if (path === "index.m3u8" || !path) {
        if (stream.url.toLowerCase().includes(".m3u8")) {
          return proxyHLSManifest(stream.url, request)
        }
        // For non-HLS, return a simple manifest that points to direct stream
        return new Response(
          `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXTINF:10.0,\n${stream.url}\n#EXT-X-ENDLIST`,
          {
            status: 200,
            headers: {
              "Content-Type": "application/vnd.apple.mpegurl",
              "Cache-Control": "no-cache",
              "Access-Control-Allow-Origin": "*",
            },
          },
        )
      }

      // If requesting a specific segment/path, build the URL
      const baseUrl = stream.url.substring(0, stream.url.lastIndexOf("/"))
      const segmentUrl = `${baseUrl}/${path}`
      
      if (segmentUrl.toLowerCase().includes(".m3u8")) {
        return proxyHLSManifest(segmentUrl, request)
      } else {
        return proxyHLSSegment(segmentUrl)
      }
    } catch (error) {
      console.error("[v0] Naga channel proxy error:", error)
      return new Response("Channel proxy error", { status: 502 })
    }
  }

  // Original mode: direct URL proxy
  if (!url) {
    return new Response("Missing URL or channel parameter", { status: 400 })
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
        "Cache-Control": "public, max-age=10, s-maxage=10",
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
        "Cache-Control": "public, max-age=21600, s-maxage=21600, immutable",
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
