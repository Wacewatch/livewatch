import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
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

    const { name, category, language, logo, background, sources, mergeIds } = await request.json()

    // Generate unique ID
    const id = `custom_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`

    // If merging, collect sources from existing channels
    let allSources = sources || []
    if (mergeIds && Array.isArray(mergeIds) && mergeIds.length > 0) {
      const { data: existingChannels } = await supabase.from("catalog_cache").select("sources").in("id", mergeIds)

      if (existingChannels) {
        for (const ch of existingChannels) {
          const channelSources = JSON.parse(ch.sources || "[]")
          allSources = [...allSources, ...channelSources]
        }
      }

      // Disable merged channels
      await supabase.from("catalog_cache").update({ enabled: false }).in("id", mergeIds)
    }

    // Create new channel
    const { error } = await supabase.from("catalog_cache").insert({
      id,
      name,
      category: category || "Divers",
      language: language || "FR",
      logo: logo || null,
      background: background || null,
      sources: JSON.stringify(allSources),
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[v0] Create channel error:", error)
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 })
  }
}
