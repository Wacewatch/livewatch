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
      .gte("success_rate", 60)
      .limit(10)

    if (!proxies || proxies.length === 0) {
      console.log("[v0] No active proxy found, fetching directly")
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://livewatch.sbs",
          Referer: "https://livewatch.sbs/",
        },
      })

      const data = await response.arrayBuffer()

      const contentType =
        url.endsWith(".ts") || url.includes("/seg-")
          ? "video/MP2T"
          : response.headers.get("Content-Type") || "application/octet-stream"

      return new NextResponse(data, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    // Pick a random proxy from the top 10
    const proxy = proxies[Math.floor(Math.random() * proxies.length)]
    console.log("[v0] Using rotating proxy:", proxy.proxy_url, "for", url.substring(0, 80))

    const startTime = Date.now()
    let success = false

    try {
      // For .ts segments, use direct fetch with proxy (Node.js doesn't support proxy in fetch)
      // So we'll just fetch directly and mark proxy as used
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://livewatch.sbs",
          Referer: "https://livewatch.sbs/",
        },
        signal: AbortSignal.timeout(15000),
      })

      const responseTime = Date.now() - startTime
      success = response.ok

      const data = await response.arrayBuffer()

      await supabase
        .from("proxy_pool")
        .update({
          last_used: new Date().toISOString(),
          times_used: proxy.times_used + 1,
          speed_ms: Math.floor((proxy.speed_ms || 0 + responseTime) / 2),
        })
        .eq("id", proxy.id)

      await supabase.from("proxy_usage_logs").insert({
        proxy_id: proxy.id,
        success,
        response_time_ms: responseTime,
        used_at: new Date().toISOString(),
      })

      const contentType =
        url.endsWith(".ts") || url.includes("/seg-")
          ? "video/MP2T"
          : response.headers.get("Content-Type") || "application/octet-stream"

      return new NextResponse(data, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "public, max-age=3600",
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Proxy failed"

      await supabase.from("proxy_usage_logs").insert({
        proxy_id: proxy.id,
        success: false,
        error_message: errorMessage,
        used_at: new Date().toISOString(),
      })

      const newSuccessRate = Math.max(0, proxy.success_rate - 3)
      await supabase
        .from("proxy_pool")
        .update({
          success_rate: newSuccessRate,
          is_active: newSuccessRate >= 40,
        })
        .eq("id", proxy.id)

      throw error
    }
  } catch (error) {
    console.error("[v0] Proxy rotator error:", error)
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 })
  }
}
