export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return new Response("URL parameter required", { status: 400 })
    }

    console.log("[v0] Proxying stream:", url)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://movix.club/",
      },
    })

    if (!response.ok) {
      console.error("[v0] Stream fetch failed:", response.status)
      return new Response("Stream not available", { status: response.status })
    }

    const contentType = response.headers.get("content-type") || ""

    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegurl") ||
      url.includes(".m3u8")
    ) {
      const text = await response.text()
      console.log("[v0] Rewriting M3U8 playlist")

      // Get the base URL for resolving relative URLs
      const baseUrl = new URL(url)
      const baseOrigin = `${baseUrl.protocol}//${baseUrl.host}`
      const basePath = url.substring(0, url.lastIndexOf("/") + 1)

      // Rewrite all URLs in the playlist to go through our proxy
      const rewrittenPlaylist = text
        .split("\n")
        .map((line) => {
          // Skip comments and empty lines
          if (line.startsWith("#") || !line.trim()) {
            return line
          }

          // This is a URL line
          let targetUrl = line.trim()

          // Convert relative URLs to absolute
          if (!targetUrl.startsWith("http")) {
            if (targetUrl.startsWith("/")) {
              targetUrl = baseOrigin + targetUrl
            } else {
              targetUrl = basePath + targetUrl
            }
          }

          // Rewrite to go through our proxy
          const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(targetUrl)}`
          return proxiedUrl
        })
        .join("\n")

      return new Response(rewrittenPlaylist, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-cache",
        },
      })
    }

    const headers = new Headers()
    response.headers.forEach((value, key) => {
      headers.set(key, value)
    })

    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    headers.set("Access-Control-Allow-Headers", "*")

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error("[v0] Proxy stream error:", error)
    return new Response("Proxy error", { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
