import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
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

    const { data: channels, error } = await supabase
      .from("catalog_cache")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error

    return NextResponse.json({ channels: channels || [] })
  } catch (error) {
    console.error("[v0] Admin channels fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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

    const { id, enabled } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    console.log("[v0] Toggling channel:", id, "to enabled:", enabled)

    const updates: any = { last_synced: new Date().toISOString() }
    if (typeof enabled === "boolean") updates.enabled = enabled

    const { error, data } = await supabase.from("catalog_cache").update(updates).eq("id", id).select()

    if (error) {
      console.error("[v0] Toggle error:", error)
      throw error
    }

    console.log("[v0] Channel toggled successfully:", data)
    return NextResponse.json({ success: true, channel: data?.[0] })
  } catch (error) {
    console.error("[v0] Admin channel update error:", error)
    return NextResponse.json(
      { error: "Failed to update channel", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

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

    const { channels } = await request.json()

    // Bulk upsert channels
    const { error } = await supabase.from("catalog_cache").upsert(
      channels.map((ch: any, index: number) => ({
        id: ch.baseId || ch.baseName,
        name: ch.displayName,
        enabled: true,
        sort_order: index,
      })),
      { onConflict: "id" },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin channel sync error:", error)
    return NextResponse.json({ error: "Failed to sync channels" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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

    const { id, name, category, language, logo, background } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    console.log("[v0] Editing channel:", id, { name, category, language })

    const updates: any = { last_synced: new Date().toISOString() }
    if (name) updates.name = name
    if (category) updates.category = category
    if (language) updates.language = language
    if (logo !== undefined) updates.logo = logo
    if (background !== undefined) updates.background = background

    const { error, data } = await supabase.from("catalog_cache").update(updates).eq("id", id).select()

    if (error) {
      console.error("[v0] Edit error:", error)
      throw error
    }

    console.log("[v0] Channel edited successfully:", data)
    return NextResponse.json({ success: true, channel: data?.[0] })
  } catch (error) {
    console.error("[v0] Admin channel update error:", error)
    return NextResponse.json(
      { error: "Failed to update channel", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("catalog_cache").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin channel delete error:", error)
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 })
  }
}
