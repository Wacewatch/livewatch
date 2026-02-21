import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 300

let syncInterval: NodeJS.Timeout | null = null
let lastSyncTime: number = 0

// Auto-sync every 30 minutes without cron
async function startAutoSync() {
  // Clear existing interval if any
  if (syncInterval) {
    clearInterval(syncInterval)
  }

  // Function to perform sync
  const performSync = async () => {
    const now = Date.now()
    // Prevent duplicate syncs within 25 minutes
    if (now - lastSyncTime < 25 * 60 * 1000) {
      console.log("[v0] Delta Auto-Sync: Skipping - too soon since last sync")
      return
    }

    lastSyncTime = now
    console.log("[v0] Delta Auto-Sync: Starting automatic sync...")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/delta/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
        }
      )

      if (response.ok) {
        console.log("[v0] Delta Auto-Sync: Completed successfully")
      } else {
        console.error("[v0] Delta Auto-Sync: Failed:", await response.text())
      }
    } catch (error) {
      console.error("[v0] Delta Auto-Sync: Error:", error)
    }
  }

  // Run immediately on startup
  performSync()

  // Then run every 30 minutes
  syncInterval = setInterval(performSync, 30 * 60 * 1000)
}

// Start auto-sync when this module loads
startAutoSync()

export async function GET() {
  return NextResponse.json({
    status: "Auto-sync active",
    intervalMinutes: 30,
    lastSync: lastSyncTime ? new Date(lastSyncTime).toISOString() : "Never",
  })
}
