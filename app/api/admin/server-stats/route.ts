import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const processMemory = process.memoryUsage()
    const processUptime = process.uptime()

    const cpuUsage = process.cpuUsage()
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000 / processUptime / 1000) * 100

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { count: activeConnections } = await supabase
      .from("active_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_heartbeat", twoMinutesAgo)

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recentViews } = await supabase.from("channel_views").select("id").gte("viewed_at", oneMinuteAgo)

    const requestsPerMinute = recentViews?.length || 0

    const estimatedBandwidthMBps = (activeConnections || 0) * 2.5
    const estimatedBandwidthGBph = (estimatedBandwidthMBps * 60 * 60) / 1024

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Count Source 1 usage (proxy requests)
    const { count: source1Count } = await supabase
      .from("channel_views")
      .select("id", { count: "exact", head: true })
      .gte("viewed_at", fiveMinutesAgo)
      .not("channel_id", "ilike", "%source2%")
      .not("channel_id", "ilike", "%source3%")

    // Count Source 2 usage (stream-alt)
    const { count: source2Count } = await supabase
      .from("proxy_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("used_at", fiveMinutesAgo)
      .is("proxy_id", null)

    // Count Source 3 usage (proxy-rotator)
    const { count: source3Count } = await supabase
      .from("proxy_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("used_at", fiveMinutesAgo)
      .not("proxy_id", "is", null)

    return NextResponse.json({
      cpu: {
        model: "Next.js App Process",
        cores: 1,
        usage: Math.min(Number(cpuPercent.toFixed(2)), 100),
      },
      memory: {
        total: (processMemory.heapTotal / 1024 / 1024).toFixed(2) + " MB",
        used: (processMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
        free: ((processMemory.heapTotal - processMemory.heapUsed) / 1024 / 1024).toFixed(2) + " MB",
        usagePercent: ((processMemory.heapUsed / processMemory.heapTotal) * 100).toFixed(2),
      },
      network: {
        activeConnections: activeConnections || 0,
        requestsPerMinute,
        bandwidthEstimate: estimatedBandwidthGBph > 0 ? `~${estimatedBandwidthGBph.toFixed(2)} GB/h` : "0.00 GB/h",
        source1: source1Count || 0,
        source2: source2Count || 0,
        source3: source3Count || 0,
      },
      system: {
        platform: process.platform,
        uptime: Math.floor(processUptime / 3600) + "h " + Math.floor((processUptime % 3600) / 60) + "m",
        uptimeSeconds: processUptime,
        nodeVersion: process.version,
      },
    })
  } catch (error) {
    console.error("[v0] Server stats error:", error)
    return NextResponse.json({ error: "Failed to fetch server stats" }, { status: 500 })
  }
}
