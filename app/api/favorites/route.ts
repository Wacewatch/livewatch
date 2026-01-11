import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ favorites: [] })
    }

    const { data, error } = await supabase.from("user_favorites").select("channel_id").eq("user_id", user.id)

    if (error) throw error

    const favorites = data?.map((f) => f.channel_id) || []
    return NextResponse.json({ favorites })
  } catch (error: any) {
    console.error("[v0] Error fetching favorites:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { channel_id } = await request.json()

    const { error } = await supabase.from("user_favorites").insert({ user_id: user.id, channel_id })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error adding favorite:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { channel_id } = await request.json()

    const { error } = await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("channel_id", channel_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error removing favorite:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
