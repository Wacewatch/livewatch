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

    const { data: countries, error } = await supabase.from("countries").select("*").order("name", { ascending: true })

    if (error) throw error

    const countriesWithCount = await Promise.all(
      (countries || []).map(async (country) => {
        const { count } = await supabase
          .from("channels")
          .select("id", { count: "exact", head: true })
          .eq("country_id", country.id)

        return {
          ...country,
          channel_count: count || 0,
        }
      }),
    )

    return NextResponse.json({ countries: countriesWithCount })
  } catch (error) {
    console.error("[v0] Failed to fetch countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
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

    const { error } = await supabase
      .from("countries")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to update country:", error)
    return NextResponse.json({ error: "Failed to update country" }, { status: 500 })
  }
}
