import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.user_metadata?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { data: channels, error } = await supabase
      .from("channels")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ channels })
  } catch (error) {
    console.error("[v0] Admin channels fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.user_metadata?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id, enabled, sort_order } = await request.json()

    const updates: any = { updated_at: new Date().toISOString() }
    if (typeof enabled === "boolean") updates.enabled = enabled
    if (typeof sort_order === "number") updates.sort_order = sort_order

    const { error } = await supabase.from("channels").update(updates).eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin channel update error:", error)
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.user_metadata?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { channels } = await request.json()

    // Bulk upsert channels
    const { error } = await supabase.from("channels").upsert(
      channels.map((ch: any, index: number) => ({
        id: ch.baseName || ch.baseId,
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
