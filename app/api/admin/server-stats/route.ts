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
    // Get process stats (this Next.js app)
    const processMemory = process.memoryUsage()
    const processUptime = process.uptime()

    // Get CPU usage for this process
    const cpuUsage = process.cpuUsage()
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000 / processUptime / 1000) * 100

    // Get active connections (estimate based on active sessions)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count: activeConnections } = await supabase
      .from("active_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_heartbeat", fiveMinutesAgo)

    // Get network stats from tracking
    const { data: recentSessions } = await supabase
      .from("channel_views")
      .select("id")
      .gte("viewed_at", new Date(Date.now() - 60 * 1000).toISOString())

    const requestsPerMinute = recentSessions?.length || 0

    return NextResponse.json({
      cpu: {
        model: "Next.js App Process",
        cores: 1,
        usage: Math.min(cpuPercent.toFixed(2), 100),
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
        bandwidthEstimate: `~${((requestsPerMinute * 2.5) / 1024).toFixed(2)} GB/h`,
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
