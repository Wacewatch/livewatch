import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PROXY_ENDPOINTS = [
  "https://morning-wildflower-3cf3.wavewatchcontact.workers.dev",
  "https://proxiesembed.movix.club/proxy?url=",
  "https://fgqmaalhy7acgwwhm.ngoldpklyoc.workers.dev/?url=",
]

async function tryFetchWithProxy(url: string, proxyEndpoint: string, timeout = 15000): Promise<Response> {
  const isMovixProxy = proxyEndpoint.includes("movix.club")
  const proxyUrl = isMovixProxy
    ? `${proxyEndpoint}${encodeURIComponent(url)}`
    : `${proxyEndpoint}?url=${encodeURIComponent(url)}`

  const response = await fetch(proxyUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://vavoo.to/",
      Origin: "https://vavoo.to",
    },
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) {
    throw new Error(`Proxy returned ${response.status}`)
  }

  return response
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")
    const retryIndex = Number.parseInt(searchParams.get("retry") || "0")

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
    }

    const supabase = await createClient()

    let lastError: Error | null = null
    let successfulResponse: Response | null = null
    let usedProxyIndex = retryIndex

    // Start from retryIndex and try up to 3 proxies
    for (let i = 0; i < 3; i++) {
      const proxyIndex = (retryIndex + i) % PROXY_ENDPOINTS.length
      const proxyEndpoint = PROXY_ENDPOINTS[proxyIndex]

      try {
        console.log(
          `[v0] Source 3: Trying proxy ${proxyIndex + 1}/${PROXY_ENDPOINTS.length}: ${proxyEndpoint.substring(0, 50)}...`,
        )
        successfulResponse = await tryFetchWithProxy(url, proxyEndpoint)
        usedProxyIndex = proxyIndex
        console.log(`[v0] Source 3: Proxy ${proxyIndex + 1} succeeded`)
        break
      } catch (error) {
        console.log(
          `[v0] Source 3: Proxy ${proxyIndex + 1} failed:`,
          error instanceof Error ? error.message : "Unknown",
        )
        lastError = error instanceof Error ? error : new Error("Unknown error")
      }
    }

    if (!successfulResponse) {
      // Log failure
      await supabase
        .from("proxy_usage_logs")
        .insert({
          source: "source3",
          success: false,
          used_at: new Date().toISOString(),
        })
        .catch(() => {})

      return NextResponse.json({ error: "All proxies failed", details: lastError?.message }, { status: 500 })
    }

    const contentType = successfulResponse.headers.get("content-type") || ""

    // Handle M3U8 manifests - rewrite URLs to use proxy-rotator with next proxy index
    if (contentType.includes("mpegurl") || url.includes(".m3u8") || contentType.includes("x-mpegURL")) {
      const text = await successfulResponse.text()

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

            return `/api/proxy-rotator?url=${encodeURIComponent(absoluteUrl)}&retry=${usedProxyIndex}`
          }

          return line
        })
        .join("\n")

      // Log success
      await supabase
        .from("proxy_usage_logs")
        .insert({
          source: "source3",
          success: true,
          used_at: new Date().toISOString(),
        })
        .catch(() => {})

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

    // Handle binary data (TS segments)
    const data = await successfulResponse.arrayBuffer()

    const finalContentType =
      url.endsWith(".ts") || url.includes("/seg-") ? "video/MP2T" : contentType || "application/octet-stream"

    // Log success
    await supabase
      .from("proxy_usage_logs")
      .insert({
        source: "source3",
        success: true,
        used_at: new Date().toISOString(),
      })
      .catch(() => {})

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": finalContentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error) {
    console.error("[v0] Proxy rotator error:", error)
    return NextResponse.json(
      { error: "Proxy request failed", details: error instanceof Error ? error.message : "Unknown error" },
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
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  })
}
