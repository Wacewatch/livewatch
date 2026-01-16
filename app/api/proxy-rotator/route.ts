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

    const { data: proxy } = await supabase
      .from("proxy_pool")
      .select("*")
      .eq("is_active", true)
      .gte("success_rate", 70)
      .order("last_used", { ascending: true, nullsFirst: true })
      .limit(1)
      .single()

    if (!proxy) {
      console.log("[v0] No active proxy found, fetching directly")
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://livewatch.sbs",
        },
      })

      const data = await response.arrayBuffer()

      return new NextResponse(data, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-cache",
        },
      })
    }

    console.log("[v0] Using proxy:", proxy.proxy_url)

    const startTime = Date.now()
    let success = false
    let errorMessage = null

    try {
      const proxyResponse = await fetch(url, {
        // @ts-ignore
        proxy: proxy.proxy_url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://livewatch.sbs",
        },
        signal: AbortSignal.timeout(10000),
      })

      const responseTime = Date.now() - startTime
      success = proxyResponse.ok

      const data = await proxyResponse.arrayBuffer()

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

      return new NextResponse(data, {
        status: proxyResponse.status,
        headers: {
          "Content-Type": proxyResponse.headers.get("Content-Type") || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-cache",
        },
      })
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Proxy failed"

      await supabase.from("proxy_usage_logs").insert({
        proxy_id: proxy.id,
        success: false,
        error_message: errorMessage,
        used_at: new Date().toISOString(),
      })

      const newSuccessRate = Math.max(0, proxy.success_rate - 5)
      await supabase
        .from("proxy_pool")
        .update({
          success_rate: newSuccessRate,
          is_active: newSuccessRate >= 50,
        })
        .eq("id", proxy.id)

      throw error
    }
  } catch (error) {
    console.error("[v0] Proxy rotator error:", error)
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 })
  }
}
