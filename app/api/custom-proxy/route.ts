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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
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
      }
    )

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
    const fullProxyUrl = proxyUrl.includes("?")
      ? `${proxyUrl}${encodeURIComponent(url)}`
      : `${proxyUrl}?url=${encodeURIComponent(url)}`

    console.log("[custom-proxy] Fetching from:", fullProxyUrl.substring(0, 150))

    // Fetch through the custom proxy
    const response = await fetch(fullProxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      console.error("[custom-proxy] Proxy returned:", response.status)
      throw new Error(`Proxy returned ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream"
    const isM3U8 = url.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")

    if (isM3U8) {
      let content = await response.text()

      console.log("[custom-proxy] M3U8 detected, rewriting URLs")

      // Parse base URL for relative path resolution
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)

      // Split into lines and rewrite
      const lines = content.split("\n")
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim()

        // Keep comments and empty lines
        if (trimmed.startsWith("#") || trimmed === "") {
          return line
        }

        // Check if this is a TS segment or M3U8 playlist
        const isSegment = 
          trimmed.endsWith(".ts") || 
          trimmed.includes(".ts?") ||
          trimmed.endsWith(".m3u8") || 
          trimmed.includes(".m3u8?")

        if (isSegment) {
          // Make URL absolute if it's relative
          const absoluteUrl = trimmed.startsWith("http") ? trimmed : baseUrl + trimmed

          // Return proxied URL
          return `/api/custom-proxy?url=${encodeURIComponent(absoluteUrl)}${
            sourceId ? `&source=${sourceId}` : ""
          }`
        }

        // Return line as-is if not a media file
        return line
      })

      const rewrittenContent = rewrittenLines.join("\n")

      console.log("[custom-proxy] M3U8 rewritten successfully")

      return new NextResponse(rewrittenContent, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    // For TS segments and other content, return as-is
    const data = await response.arrayBuffer()

    console.log("[custom-proxy] Binary content returned, size:", data.byteLength)

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[custom-proxy] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy request failed" },
      { status: 500 }
    )
  }
}
