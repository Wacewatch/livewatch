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
    let memoryUsed = 0
    let memoryTotal = 0
    let cpuPercent = 0
    let uptimeSeconds = 0
    let platform = "vercel"
    let nodeVersion = "v20.x"

    // Try to get real stats if available (Node.js runtime)
    if (typeof process !== "undefined") {
      try {
        if (process.memoryUsage && typeof process.memoryUsage === "function") {
          const mem = process.memoryUsage()
          memoryUsed = mem.heapUsed
          memoryTotal = mem.heapTotal
        }
      } catch {}

      try {
        if (process.uptime && typeof process.uptime === "function") {
          uptimeSeconds = process.uptime()
        }
      } catch {}

      try {
        if (process.cpuUsage && typeof process.cpuUsage === "function") {
          const cpu = process.cpuUsage()
          cpuPercent = uptimeSeconds > 0 ? Math.min(((cpu.user + cpu.system) / 1000000 / uptimeSeconds) * 100, 100) : 0
        }
      } catch {}

      if (process.platform) {
        platform = process.platform
      }
      if (process.version) {
        nodeVersion = process.version
      }
    }

    // Get active connections from database
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { count: activeConnections } = await supabase
      .from("active_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_heartbeat", twoMinutesAgo)

    const { count: activeViewers } = await supabase
      .from("active_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_heartbeat", twoMinutesAgo)
      .not("current_channel", "is", null)

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recentViews } = await supabase.from("channel_views").select("id").gte("viewed_at", oneMinuteAgo)

    const requestsPerMinute = recentViews?.length || 0

    // Estimate memory if not available from process
    if (memoryTotal === 0) {
      memoryTotal = 256 * 1024 * 1024 // 256 MB assumed for Vercel
      memoryUsed = Math.min((activeConnections || 1) * 5 * 1024 * 1024 + 30 * 1024 * 1024, memoryTotal * 0.9)
    }

    const estimatedBandwidthMBps = (activeConnections || 0) * 2.5
    const estimatedBandwidthGBph = (estimatedBandwidthMBps * 60 * 60) / 1024

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { count: totalViewsCount } = await supabase
      .from("channel_views")
      .select("id", { count: "exact", head: true })
      .gte("viewed_at", fiveMinutesAgo)

    const { count: source2Count } = await supabase
      .from("proxy_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("used_at", fiveMinutesAgo)
      .eq("source", "source2")

    const { count: source3Count } = await supabase
      .from("proxy_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("used_at", fiveMinutesAgo)
      .eq("source", "source3")

    // This is because most users use Source 1 by default
    const totalViews = totalViewsCount || 0
    const s2 = source2Count || 0
    const s3 = source3Count || 0

    // If we have active viewers, distribute based on usage
    const totalActive = activeViewers || 0
    let source1Count = Math.max(0, totalActive - s2 - s3)

    // If no proxy logs, assume all viewers are on Source 1
    if (s2 === 0 && s3 === 0 && totalActive > 0) {
      source1Count = totalActive
    }

    const totalRequests = source1Count + s2 + s3

    const memoryUsedMB = memoryUsed / 1024 / 1024
    const memoryTotalMB = memoryTotal / 1024 / 1024
    const memoryFreeMB = memoryTotalMB - memoryUsedMB
    const memoryPercent = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0

    return NextResponse.json({
      cpu: {
        model: "Next.js App Process",
        cores: 1,
        usage: Number(cpuPercent.toFixed(2)),
      },
      memory: {
        total: memoryTotalMB.toFixed(2) + " MB",
        used: memoryUsedMB.toFixed(2) + " MB",
        free: memoryFreeMB.toFixed(2) + " MB",
        usagePercent: memoryPercent.toFixed(2),
      },
      network: {
        activeConnections: activeConnections || 0,
        activeViewers: activeViewers || 0,
        requestsPerMinute,
        bandwidthEstimate: estimatedBandwidthGBph > 0 ? `~${estimatedBandwidthGBph.toFixed(2)} GB/h` : "0.00 GB/h",
        source1: source1Count,
        source2: s2,
        source3: s3,
        total: totalRequests,
      },
      system: {
        platform,
        uptime: Math.floor(uptimeSeconds / 3600) + "h " + Math.floor((uptimeSeconds % 3600) / 60) + "m",
        uptimeSeconds,
        nodeVersion,
      },
    })
  } catch (error) {
    console.error("[v0] Server stats error:", error)
    return NextResponse.json({ error: "Failed to fetch server stats" }, { status: 500 })
  }
}
