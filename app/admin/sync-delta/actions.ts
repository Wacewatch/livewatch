"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function syncDeltaData() {
  try {
    // Verify admin user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    console.log("[v0] Delta Sync: Starting manual sync by admin:", user.email)

    // Call the sync API directly with CRON_SECRET since we verified admin
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/delta/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Delta Sync: API error:", errorText)
      return { success: false, error: errorText || "Sync failed" }
    }

    const result = await response.json()

    // Revalidate channels pages
    revalidatePath("/channels/delta")
    
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Delta Sync Action Error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
