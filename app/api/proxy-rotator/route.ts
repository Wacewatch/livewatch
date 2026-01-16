import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: proxies } = await supabase
      .from("proxy_pool")
      .select("*")
      .eq("is_active", true)
      .gte("success_rate", 50)
      .order("speed_ms", { ascending: true, nullsFirst: false })
      .order("success_rate", { ascending: false })
      .limit(20)

    console.log("[v0] Proxy rotator: Found", proxies?.length || 0, "active proxies")

    // Function to fetch with a specific proxy or direct
    const fetchWithProxy = async (targetUrl: string, proxyInfo?: any): Promise<Response> => {
      const startTime = Date.now()

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Referer: "https://tvvoo.live/",
          Accept: "*/*",
          "Accept-Encoding": "identity",
          Origin: "https://tvvoo.live",
        },
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
      })

      const responseTime = Date.now() - startTime

      // Update proxy stats if we used one
      if (proxyInfo) {
        const newAvgSpeed = proxyInfo.speed_ms ? Math.floor((proxyInfo.speed_ms + responseTime) / 2) : responseTime

        await supabase
          .from("proxy_pool")
          .update({
            last_used: new Date().toISOString(),
            times_used: (proxyInfo.times_used || 0) + 1,
            speed_ms: newAvgSpeed,
            success_rate: Math.min(100, (proxyInfo.success_rate || 50) + 1),
          })
          .eq("id", proxyInfo.id)
      }

      return response
    }

    // Try fetching with retries
    let lastError: Error | null = null
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const proxyToUse = proxies && proxies.length > attempt ? proxies[attempt] : null

      console.log(`[v0] Proxy rotator attempt ${attempt + 1}/${maxRetries}:`, proxyToUse?.proxy_url || "direct fetch")

      try {
        const response = await fetchWithProxy(url, proxyToUse)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const contentType = response.headers.get("content-type") || ""

        if (contentType.includes("mpegurl") || url.includes(".m3u8") || contentType.includes("x-mpegURL")) {
          const text = await response.text()
          console.log("[v0] Proxy rotator: Rewriting M3U8 manifest URLs")

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

                return `/api/proxy-rotator?url=${encodeURIComponent(absoluteUrl)}`
              }

              return line
            })
            .join("\n")

          console.log("[v0] Proxy rotator: M3U8 manifest rewritten successfully")

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

        // Handle binary data (TS segments, etc.)
        const data = await response.arrayBuffer()

        const finalContentType =
          url.endsWith(".ts") || url.includes("/seg-") ? "video/MP2T" : contentType || "application/octet-stream"

        console.log("[v0] Proxy rotator: Success, size:", data.byteLength, "bytes")

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
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`[v0] Proxy rotator attempt ${attempt + 1} failed:`, lastError.message)

        // Update proxy stats on failure
        if (proxyToUse) {
          const newSuccessRate = Math.max(0, (proxyToUse.success_rate || 50) - 5)
          await supabase
            .from("proxy_pool")
            .update({
              success_rate: newSuccessRate,
              is_active: newSuccessRate >= 30,
            })
            .eq("id", proxyToUse.id)
        }
      }
    }

    // All retries failed
    console.error("[v0] Proxy rotator: All attempts failed")
    return NextResponse.json({ error: "All proxy attempts failed", details: lastError?.message }, { status: 500 })
  } catch (error) {
    console.error("[v0] Proxy rotator error:", error)
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 })
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
