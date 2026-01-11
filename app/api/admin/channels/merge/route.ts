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

    const { primaryId, mergeIds } = await request.json()

    const { data: primaryChannel } = await supabase.from("channels").select("*").eq("id", primaryId).single()

    const { data: mergeChannels } = await supabase.from("channels").select("*").in("id", mergeIds)

    if (!primaryChannel || !mergeChannels) {
      return NextResponse.json({ error: "Channels not found" }, { status: 404 })
    }

    const { data: existingSources } = await supabase.from("channel_sources").select("*").eq("channel_id", primaryId)

    const allSources = []

    // Add existing sources if any
    if (existingSources) {
      allSources.push(...existingSources)
    }

    // Add sources from channels being merged
    for (const channel of mergeChannels) {
      // Check if this channel has its own sources
      const { data: channelSources } = await supabase.from("channel_sources").select("*").eq("channel_id", channel.id)

      if (channelSources && channelSources.length > 0) {
        // Add those sources
        for (const source of channelSources) {
          allSources.push({
            source_id: source.source_id,
            source_name: source.source_name,
            quality: source.quality,
            priority: source.priority,
          })
        }
      } else {
        // Add the channel itself as a source
        const quality = channel.name.toUpperCase().includes("4K")
          ? "4K"
          : channel.name.toUpperCase().includes("FHD")
            ? "FHD"
            : channel.name.toUpperCase().includes("HD")
              ? "HD"
              : "SD"
        const priority = quality === "4K" ? 4 : quality === "FHD" ? 3 : quality === "HD" ? 2 : 1

        allSources.push({
          source_id: channel.id,
          source_name: channel.name,
          quality,
          priority,
        })
      }
    }

    await supabase.from("channel_sources").delete().eq("channel_id", primaryId)

    const sourcesToInsert = allSources.map((source, index) => ({
      id: `${primaryId}_src_${index}`,
      channel_id: primaryId,
      source_id: source.source_id,
      source_name: source.source_name,
      quality: source.quality,
      priority: source.priority,
    }))

    const { error: insertError } = await supabase.from("channel_sources").insert(sourcesToInsert)

    if (insertError) throw insertError

    const { error: deleteError } = await supabase.from("channels").delete().in("id", mergeIds)

    if (deleteError) throw deleteError

    console.log(
      "[v0] Merged",
      mergeChannels.length,
      "channels into",
      primaryChannel.name,
      "with",
      allSources.length,
      "total sources",
    )

    return NextResponse.json({ success: true, sourcesCount: allSources.length })
  } catch (error) {
    console.error("[v0] Channel merge error:", error)
    return NextResponse.json({ error: "Failed to merge channels" }, { status: 500 })
  }
}
