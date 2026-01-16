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

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: activeSessions } = await supabase
      .from("active_sessions")
      .select("id, user_id, channel_id, channel_name")
      .gte("last_heartbeat", fiveMinutesAgo)

    const activeConnections = activeSessions?.length || 0

    const sessionsWatching = activeSessions?.filter((s) => s.channel_id) || []
    const activeViewers = sessionsWatching.length

    // Requests per minute from channel_views
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: requestsPerMinute } = await supabase
      .from("channel_views")
      .select("id", { count: "exact", head: true })
      .gte("viewed_at", oneMinuteAgo)

    // Estimate memory if not available from process
    if (memoryTotal === 0) {
      memoryTotal = 256 * 1024 * 1024
      memoryUsed = Math.min((activeConnections || 1) * 5 * 1024 * 1024 + 30 * 1024 * 1024, memoryTotal * 0.9)
    }

    const estimatedBandwidthMBps = (activeViewers || 0) * 2.5
    const estimatedBandwidthGBph = (estimatedBandwidthMBps * 60 * 60) / 1024

    const { data: proxyLogs } = await supabase
      .from("proxy_usage_logs")
      .select("source, channel_id")
      .gte("used_at", fiveMinutesAgo)

    const source2Channels = new Set<string>()
    const source3Channels = new Set<string>()

    proxyLogs?.forEach((log) => {
      if (log.channel_id) {
        if (log.source === "source2") source2Channels.add(log.channel_id)
        if (log.source === "source3") source3Channels.add(log.channel_id)
      }
    })

    const source2Count = source2Channels.size
    const source3Count = source3Channels.size

    // But we need to be careful: a viewer might have tried multiple sources
    // So S1 = activeViewers who are NOT in S2 or S3
    const source1Count = Math.max(0, activeViewers - source2Count - source3Count)

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
        activeConnections: activeConnections,
        activeViewers: activeViewers,
        requestsPerMinute: requestsPerMinute || 0,
        bandwidthEstimate: estimatedBandwidthGBph > 0 ? `~${estimatedBandwidthGBph.toFixed(2)} GB/h` : "0.00 GB/h",
        source1: source1Count,
        source2: source2Count,
        source3: source3Count,
        total: activeViewers,
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
