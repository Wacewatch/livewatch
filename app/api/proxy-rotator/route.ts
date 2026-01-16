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
      .gte("success_rate", 70)
      .order("success_rate", { ascending: false })
      .order("speed_ms", { ascending: true })
      .limit(5)

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

    const proxy = proxies[0]
    console.log(
      "[v0] Using best rotating proxy:",
      proxy.proxy_url,
      "SR:",
      proxy.success_rate,
      "Speed:",
      proxy.speed_ms,
      "ms",
    )

    const startTime = Date.now()
    let success = false
    let attempts = 0
    const maxAttempts = Math.min(proxies.length, 3)

    while (attempts < maxAttempts) {
      try {
        const currentProxy = proxies[attempts]
        console.log(`[v0] Attempt ${attempts + 1}/${maxAttempts} with proxy:`, currentProxy.proxy_url)

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

        if (!success) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.arrayBuffer()

        await supabase
          .from("proxy_pool")
          .update({
            last_used: new Date().toISOString(),
            times_used: currentProxy.times_used + 1,
            speed_ms: Math.floor(
              ((currentProxy.speed_ms || 0) * currentProxy.times_used + responseTime) / (currentProxy.times_used + 1),
            ),
            success_rate: Math.min(100, currentProxy.success_rate + 1),
          })
          .eq("id", currentProxy.id)

        await supabase.from("proxy_usage_logs").insert({
          proxy_id: currentProxy.id,
          success: true,
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
        const currentProxy = proxies[attempts]
        const errorMessage = error instanceof Error ? error.message : "Proxy failed"

        console.log(`[v0] Proxy ${attempts + 1} failed:`, errorMessage)

        await supabase.from("proxy_usage_logs").insert({
          proxy_id: currentProxy.id,
          success: false,
          error_message: errorMessage,
          used_at: new Date().toISOString(),
        })

        const newSuccessRate = Math.max(0, currentProxy.success_rate - 5)
        await supabase
          .from("proxy_pool")
          .update({
            success_rate: newSuccessRate,
            is_active: newSuccessRate >= 40,
          })
          .eq("id", currentProxy.id)

        attempts++

        if (attempts >= maxAttempts) {
          throw error
        }
      }
    }

    throw new Error("All proxies failed")
  } catch (error) {
    console.error("[v0] Proxy rotator error:", error)
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 })
  }
}
