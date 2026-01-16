import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getBestProxy(supabase: any): Promise<string | null> {
  try {
    const { data: proxies, error } = await supabase
      .from("proxies")
      .select("proxy_url, host, port, speed_ms, success_rate")
      .eq("is_active", true)
      .gt("success_rate", 50) // Only use proxies with >50% success rate
      .order("speed_ms", { ascending: true })
      .order("success_rate", { ascending: false })
      .limit(10)

    if (error || !proxies || proxies.length === 0) {
      console.log("[v0] No valid proxies in database")
      return null
    }

    // Pick random from top 10 fastest to distribute load
    const randomIndex = Math.floor(Math.random() * Math.min(proxies.length, 5))
    const proxy = proxies[randomIndex]

    return proxy.proxy_url || `http://${proxy.host}:${proxy.port}`
  } catch (error) {
    console.error("[v0] Error fetching proxy:", error)
    return null
  }
}

async function fetchViaProxy(targetUrl: string, proxyUrl: string, timeout = 20000): Promise<Response | null> {
  try {
    // Since we can't use HTTP proxies directly in serverless, use our proxy as a relay
    // The proxy URL in DB is stored but we use external workers that accept proxy parameter
    const workerUrl = `https://morning-wildflower-3cf3.wavewatchcontact.workers.dev?url=${encodeURIComponent(targetUrl)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(workerUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return response
    }
    return null
  } catch (error) {
    console.log("[v0] Proxy fetch failed:", error instanceof Error ? error.message : "Unknown")
    return null
  }
}

async function fetchDirect(url: string, timeout = 15000): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://tvvoo.live/",
        Accept: "*/*",
        Origin: "https://tvvoo.live",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return response
    }
    return null
  } catch (error) {
    return null
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
    }

    const supabase = await createClient()

    const proxyUrl = await getBestProxy(supabase)

    let response: Response | null = null
    let usedMethod = "none"

    if (proxyUrl) {
      console.log("[v0] Source 3: Using DB proxy")
      response = await fetchViaProxy(targetUrl, proxyUrl)
      if (response) usedMethod = "db_proxy"
    }

    if (!response) {
      console.log("[v0] Source 3: Trying direct fetch")
      response = await fetchDirect(targetUrl)
      if (response) usedMethod = "direct"
    }

    if (!response) {
      // Fallback to multiple external workers
      const fallbackWorkers = [
        "https://morning-wildflower-3cf3.wavewatchcontact.workers.dev",
        "https://proxiesembed.movix.club/proxy?url=",
      ]

      for (const worker of fallbackWorkers) {
        try {
          const workerUrl = worker.includes("?")
            ? `${worker}${encodeURIComponent(targetUrl)}`
            : `${worker}?url=${encodeURIComponent(targetUrl)}`

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 20000)

          const res = await fetch(workerUrl, {
            signal: controller.signal,
            cache: "no-store",
          })

          clearTimeout(timeoutId)

          if (res.ok) {
            response = res
            usedMethod = "fallback_worker"
            break
          }
        } catch {
          continue
        }
      }
    }

    if (!response) {
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
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    const data = await response.arrayBuffer()

    const finalContentType =
      targetUrl.endsWith(".ts") || targetUrl.includes("/seg-")
        ? "video/MP2T"
        : contentType || "application/octet-stream"

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
