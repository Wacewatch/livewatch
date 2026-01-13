import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json({ success: false, error: "Clé manquante" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
    }

    const { data: keyData, error: keyError } = await supabase.from("vip_keys").select("*").eq("key", key).single()

    if (keyError || !keyData) {
      return NextResponse.json({ success: false, error: "Clé invalide" }, { status: 400 })
    }

    if (keyData.used) {
      return NextResponse.json({ success: false, error: "Clé déjà utilisée" }, { status: 400 })
    }

    const { error: updateKeyError } = await supabase
      .from("vip_keys")
      .update({
        used: true,
        used_by: user.id,
        used_by_email: user.email,
        used_at: new Date().toISOString(),
      })
      .eq("key", key)

    if (updateKeyError) {
      console.error("[v0] Error updating key:", updateKeyError)
      return NextResponse.json({ success: false, error: "Erreur lors de l'activation" }, { status: 500 })
    }

    const { error: updateProfileError } = await supabase.from("user_profiles").update({ role: "vip" }).eq("id", user.id)

    if (updateProfileError) {
      console.error("[v0] Error updating user profile:", updateProfileError)
      return NextResponse.json({ success: false, error: "Erreur lors de la mise à niveau" }, { status: 500 })
    }

    console.log(`[v0] VIP key ${key} redeemed by ${user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in VIP redemption:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
