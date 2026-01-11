import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { data: keys, error } = await supabase.from("vip_keys").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching VIP keys:", error)
      return NextResponse.json({ error: "Erreur lors de la récupération des clés" }, { status: 500 })
    }

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("[v0] Error in GET /api/admin/vip-keys:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const newKey = `VIP-${nanoid(16).toUpperCase()}`

    const { data, error } = await supabase.from("vip_keys").insert({ key: newKey }).select().single()

    if (error) {
      console.error("[v0] Error creating VIP key:", error)
      return NextResponse.json({ error: "Erreur lors de la création de la clé" }, { status: 500 })
    }

    return NextResponse.json({ key: data.key, id: data.id })
  } catch (error) {
    console.error("[v0] Error in POST /api/admin/vip-keys:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
