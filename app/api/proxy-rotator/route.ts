import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getBestProxy(supabase: any): Promise<string | null> {
  try {
    // Get the fastest active proxy from the database
    const { data: proxies, error } = await supabase
      .from("proxies")
      .select("proxy_url, host, port, speed_ms, success_rate")
      .eq("is_active", true)
      .order("speed_ms", { ascending: true })
      .order("success_rate", { ascending: false })
      .limit(10)

    if (error || !proxies || proxies.length === 0) {
      console.log("[v0] No proxies in database, using fallback")
      return null
    }

    // Return a random proxy from the top 5 fastest
    const topProxies = proxies.slice(0, 5)
    const selectedProxy = topProxies[Math.floor(Math.random() * topProxies.length)]

    console.log(
      `[v0] Selected proxy: ${selectedProxy.host}:${selectedProxy.port} (${selectedProxy.speed_ms}ms, ${selectedProxy.success_rate}% success)`,
    )

    return selectedProxy.proxy_url || `http://${selectedProxy.host}:${selectedProxy.port}`
  } catch (error) {
    console.error("[v0] Error fetching proxies:", error)
    return null
  }
}

// Fallback proxy endpoints when no proxies in DB
const FALLBACK_PROXIES = [
  "https://morning-wildflower-3cf3.wavewatchcontact.workers.dev",
  "https://proxiesembed.movix.club/proxy?url=",
  "https://fgqmaalhy7acgwwhm.ngoldpklyoc.workers.dev/?url=",
]

async function tryFetchWithProxy(url: string, proxyEndpoint: string, timeout = 20000): Promise<Response> {
  const isMovixProxy = proxyEndpoint.includes("movix.club")
  const isWorker = proxyEndpoint.includes("workers.dev")

  let proxyUrl: string
  if (isMovixProxy) {
    proxyUrl = `${proxyEndpoint}${encodeURIComponent(url)}`
  } else if (isWorker) {
    proxyUrl = proxyEndpoint.includes("?")
      ? `${proxyEndpoint}${encodeURIComponent(url)}`
      : `${proxyEndpoint}?url=${encodeURIComponent(url)}`
  } else {
    // HTTP proxy - use direct fetch through proxy
    proxyUrl = url // For HTTP proxies, we'd need a different approach
  }

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

    const dbProxy = await getBestProxy(supabase)

    // Build list of proxies to try: DB proxy first, then fallbacks
    const proxiesToTry: string[] = []
    if (dbProxy) {
      proxiesToTry.push(dbProxy)
    }
    proxiesToTry.push(...FALLBACK_PROXIES)

    let lastError: Error | null = null
    let successfulResponse: Response | null = null
    let usedProxyIndex = retryIndex

    const maxAttempts = Math.min(5, proxiesToTry.length)
    for (let i = 0; i < maxAttempts; i++) {
      const proxyIndex = (retryIndex + i) % proxiesToTry.length
      const proxyEndpoint = proxiesToTry[proxyIndex]

      try {
        console.log(`[v0] Source 3: Trying proxy ${i + 1}/${maxAttempts}: ${proxyEndpoint.substring(0, 60)}...`)
        successfulResponse = await tryFetchWithProxy(url, proxyEndpoint)
        usedProxyIndex = proxyIndex
        console.log(`[v0] Source 3: Proxy ${i + 1} succeeded`)

        // Update proxy success in DB if it was a DB proxy
        if (i === 0 && dbProxy) {
          await supabase
            .from("proxies")
            .update({
              times_used: supabase.rpc ? undefined : 1,
              last_used: new Date().toISOString(),
              success_rate: supabase.rpc ? undefined : 100,
            })
            .eq("proxy_url", dbProxy)
            .catch(() => {})
        }

        break
      } catch (error) {
        console.log(`[v0] Source 3: Proxy ${i + 1} failed:`, error instanceof Error ? error.message : "Unknown")
        lastError = error instanceof Error ? error : new Error("Unknown error")

        // Mark proxy as potentially bad in DB
        if (i === 0 && dbProxy) {
          await supabase
            .from("proxies")
            .update({ is_active: false })
            .eq("proxy_url", dbProxy)
            .catch(() => {})
        }
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

    // Handle M3U8 manifests
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
