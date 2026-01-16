import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const WORKER_URL = "https://morning-wildflower-3cf3.wavewatchcontact.workers.dev"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")
    const retryCount = Number.parseInt(searchParams.get("retry") || "0")

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
    }

    // Max 5 retries
    if (retryCount >= 5) {
      return NextResponse.json({ error: "Max retries exceeded" }, { status: 500 })
    }

    const supabase = await createClient()

    // Log usage for stats
    await supabase
      .from("proxy_usage_logs")
      .insert({
        channel_id: url.includes("vavoo") ? url.split("vavoo_")[1]?.split("|")[0] : null,
        success: false, // Will update on success
        used_at: new Date().toISOString(),
      })
      .catch(() => {})

    // Use the Cloudflare worker to fetch the content (same as Source 2)
    const workerUrl = `${WORKER_URL}?url=${encodeURIComponent(url)}`

    const response = await fetch(workerUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || ""

    // Handle M3U8 manifests - rewrite URLs to use proxy-rotator
    if (contentType.includes("mpegurl") || url.includes(".m3u8") || contentType.includes("x-mpegURL")) {
      const text = await response.text()

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

      // Log success
      await supabase
        .from("proxy_usage_logs")
        .insert({
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
    const data = await response.arrayBuffer()

    const finalContentType =
      url.endsWith(".ts") || url.includes("/seg-") ? "video/MP2T" : contentType || "application/octet-stream"

    // Log success
    await supabase
      .from("proxy_usage_logs")
      .insert({
        success: true,
        response_time_ms: 0,
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
