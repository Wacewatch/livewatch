import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import os from "os"

export async function GET() {
  const supabase = await createClient()

  // Check admin auth
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

  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2)

  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model || "Unknown"
  const cpuCount = cpus.length

  // Calculate CPU usage
  let totalIdle = 0
  let totalTick = 0
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times]
    }
    totalIdle += cpu.times.idle
  })
  const cpuUsagePercent = (100 - (100 * totalIdle) / totalTick).toFixed(2)

  const uptime = os.uptime()
  const platform = os.platform()
  const loadAvg = os.loadavg()

  return NextResponse.json({
    cpu: {
      model: cpuModel,
      cores: cpuCount,
      usage: Number.parseFloat(cpuUsagePercent),
      loadAvg: loadAvg.map((l) => l.toFixed(2)),
    },
    memory: {
      total: (totalMemory / 1024 / 1024 / 1024).toFixed(2) + " GB",
      used: (usedMemory / 1024 / 1024 / 1024).toFixed(2) + " GB",
      free: (freeMemory / 1024 / 1024 / 1024).toFixed(2) + " GB",
      usagePercent: Number.parseFloat(memoryUsagePercent),
    },
    system: {
      platform,
      uptime: Math.floor(uptime / 3600) + "h " + Math.floor((uptime % 3600) / 60) + "m",
      uptimeSeconds: uptime,
    },
  })
}
