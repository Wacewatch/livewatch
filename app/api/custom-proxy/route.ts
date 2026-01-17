import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  const sourceId = searchParams.get("source")

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    // Get the custom source configuration
    let proxyUrl: string | null = null

    if (sourceId) {
      const { data: source } = await supabase
        .from("custom_proxy_sources")
        .select("proxy_url, enabled")
        .eq("id", sourceId)
        .single()

      if (source?.enabled && source?.proxy_url) {
        proxyUrl = source.proxy_url
      }
    }

    if (!proxyUrl) {
      // Fallback: get first enabled custom source
      const { data: sources } = await supabase
        .from("custom_proxy_sources")
        .select("proxy_url")
        .eq("enabled", true)
        .order("sort_order", { ascending: true })
        .limit(1)

      if (sources && sources.length > 0) {
        proxyUrl = sources[0].proxy_url
      }
    }

    if (!proxyUrl) {
      return NextResponse.json({ error: "No custom proxy source configured" }, { status: 404 })
    }

    // Build the full proxy URL
    // The proxy_url should end with ?url= or similar parameter
    const fullProxyUrl = proxyUrl.includes("?")
      ? `${proxyUrl}${encodeURIComponent(url)}`
      : `${proxyUrl}?url=${encodeURIComponent(url)}`

    // Fetch through the custom proxy
    const response = await fetch(fullProxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      throw new Error(`Proxy returned ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream"
    const isM3U8 = url.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")

    if (isM3U8) {
      let content = await response.text()

      // Rewrite URLs in the M3U8 to go through this same endpoint
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)

      content = content.replace(/^(?!#)(.+\.ts.*)$/gm, (match) => {
        const tsUrl = match.startsWith("http") ? match : baseUrl + match
        return `/api/custom-proxy?url=${encodeURIComponent(tsUrl)}${sourceId ? `&source=${sourceId}` : ""}`
      })

      content = content.replace(/^(?!#)(.+\.m3u8.*)$/gm, (match) => {
        const m3u8Url = match.startsWith("http") ? match : baseUrl + match
        return `/api/custom-proxy?url=${encodeURIComponent(m3u8Url)}${sourceId ? `&source=${sourceId}` : ""}`
      })

      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      })
    }

    // For TS segments and other content, return as-is
    const data = await response.arrayBuffer()
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Custom proxy error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy request failed" },
      { status: 500 },
    )
  }
}
