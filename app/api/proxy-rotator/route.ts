import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getBestProxies(supabase: any, limit = 5): Promise<string[]> {
  try {
    const { data: proxies, error } = await supabase
      .from("proxies")
      .select("proxy_url, host, port, speed_ms, success_rate")
      .eq("is_active", true)
      .order("speed_ms", { ascending: true })
      .order("success_rate", { ascending: false })
      .limit(limit)

    if (error || !proxies || proxies.length === 0) {
      console.log("[v0] No proxies in database")
      return []
    }

    return proxies.map((p: any) => p.proxy_url || `http://${p.host}:${p.port}`)
  } catch (error) {
    console.error("[v0] Error fetching proxies:", error)
    return []
  }
}

async function fetchWithTimeout(url: string, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://tvvoo.live/",
        Accept: "*/*",
        "Accept-Encoding": "identity",
        Origin: "https://tvvoo.live",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
    }

    let targetUrl = url
    if (url.includes("/api/proxy-rotator")) {
      const innerUrl = new URL(url, "http://localhost")
      targetUrl = innerUrl.searchParams.get("url") || url
      console.log("[v0] Extracted inner URL from recursive call:", targetUrl.substring(0, 80))
    }

    const supabase = await createClient()

    console.log("[v0] Source 3: Fetching URL directly:", targetUrl.substring(0, 80))

    let response: Response
    let success = false

    try {
      response = await fetchWithTimeout(targetUrl)
      if (response.ok) {
        success = true
        console.log("[v0] Source 3: Direct fetch succeeded")
      }
    } catch (error) {
      console.log("[v0] Source 3: Direct fetch failed, will try external proxies")
    }

    if (!success) {
      const externalProxies = [
        "https://morning-wildflower-3cf3.wavewatchcontact.workers.dev",
        "https://proxiesembed.movix.club/proxy?url=",
      ]

      for (const proxyEndpoint of externalProxies) {
        try {
          const proxyUrl = proxyEndpoint.includes("?")
            ? `${proxyEndpoint}${encodeURIComponent(targetUrl)}`
            : `${proxyEndpoint}?url=${encodeURIComponent(targetUrl)}`

          console.log("[v0] Source 3: Trying external proxy:", proxyEndpoint.substring(0, 50))

          response = await fetchWithTimeout(proxyUrl)
          if (response.ok) {
            success = true
            console.log("[v0] Source 3: External proxy succeeded")
            break
          }
        } catch (error) {
          console.log("[v0] Source 3: External proxy failed:", error instanceof Error ? error.message : "Unknown")
        }
      }
    }

    if (!success || !response!) {
      // Log failure
      await supabase
        .from("proxy_usage_logs")
        .insert({
          source: "source3",
          success: false,
          used_at: new Date().toISOString(),
        })
        .catch(() => {})

      return NextResponse.json({ error: "All proxy methods failed" }, { status: 500 })
    }

    const contentType = response.headers.get("content-type") || ""

    if (contentType.includes("mpegurl") || targetUrl.includes(".m3u8") || contentType.includes("x-mpegURL")) {
      const text = await response.text()
      console.log("[v0] Source 3: Rewriting M3U8 manifest")

      const baseUrl = new URL(targetUrl)
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

            return `/api/proxy-rotator?url=${encodeURIComponent(absoluteUrl)}`
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

    const data = await response.arrayBuffer()

    const finalContentType =
      targetUrl.endsWith(".ts") || targetUrl.includes("/seg-")
        ? "video/MP2T"
        : contentType || "application/octet-stream"

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
