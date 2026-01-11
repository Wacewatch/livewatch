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

    console.log("[v0] Creating channel:", { name, mergeIds: mergeIds?.length || 0 })

    // Generate unique ID
    const id = `custom_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`

    // If merging, collect sources from existing channels
    let allSources = sources || []
    if (mergeIds && Array.isArray(mergeIds) && mergeIds.length > 0) {
      console.log("[v0] Merging channels:", mergeIds)
      const { data: existingChannels } = await supabase.from("catalog_cache").select("*").in("id", mergeIds)

      if (existingChannels && existingChannels.length > 0) {
        console.log("[v0] Found channels to merge:", existingChannels.length)
        for (const ch of existingChannels) {
          try {
            const channelSources = typeof ch.sources === "string" ? JSON.parse(ch.sources) : ch.sources || []
            allSources = [...allSources, ...channelSources]
          } catch (e) {
            console.error("[v0] Error parsing sources for channel:", ch.id, e)
          }
        }
        console.log("[v0] Total sources after merge:", allSources.length)

        // Disable merged channels
        const { error: disableError } = await supabase
          .from("catalog_cache")
          .update({ enabled: false })
          .in("id", mergeIds)

        if (disableError) {
          console.error("[v0] Error disabling merged channels:", disableError)
        } else {
          console.log("[v0] Disabled merged channels")
        }
      }
    }

    // Create new channel
    const newChannel = {
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
    }

    console.log("[v0] Inserting new channel:", id)
    const { error, data: inserted } = await supabase.from("catalog_cache").insert(newChannel).select()

    if (error) {
      console.error("[v0] Database error:", error)
      throw error
    }

    console.log("[v0] Channel created successfully:", inserted)
    return NextResponse.json({ success: true, id, channel: inserted[0] })
  } catch (error) {
    console.error("[v0] Create channel error:", error)
    return NextResponse.json(
      { error: "Failed to create channel", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
