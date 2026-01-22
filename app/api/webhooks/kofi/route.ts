import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Ko-fi webhook received:", body)

    // Vérifier le token Ko-fi (optionnel mais recommandé)
    const kofiToken = process.env.KOFI_VERIFICATION_TOKEN
    if (kofiToken && body.verification_token !== kofiToken) {
      console.error("[v0] Ko-fi verification token mismatch")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Vérifier que c'est un paiement
    if (body.type !== "Donation" && body.type !== "Shop Order") {
      console.log("[v0] Ko-fi webhook type:", body.type, "- ignoring")
      return NextResponse.json({ success: true })
    }

    // Extraire les informations du paiement
    const kofiTransactionId = body.kofi_transaction_id
    const amount = body.amount
    const email = body.from_email
    const senderName = body.from_name
    const isPublic = body.is_public

    if (!kofiTransactionId || !email) {
      console.error("[v0] Missing required Ko-fi data")
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    // Initialiser le client Supabase
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookieStore.getAll().forEach((cookie) => {
              cookieStore.delete(cookie.name)
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Enregistrer le paiement Ko-fi dans la base de données
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("kofi_payments")
      .insert({
        kofi_transaction_id: kofiTransactionId,
        email: email,
        amount: parseFloat(amount),
        sender_name: senderName,
        is_public: isPublic,
        raw_data: body,
        processed_at: new Date().toISOString(),
      })
      .select()

    if (paymentError) {
      console.error("[v0] Error saving Ko-fi payment:", paymentError)
      return NextResponse.json(
        { error: "Failed to save payment record" },
        { status: 500 }
      )
    }

    console.log("[v0] Ko-fi payment recorded:", paymentRecord)

    // Chercher l'utilisateur avec cet email
    const { data: users, error: userError } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", email)

    if (userError) {
      console.error("[v0] Error finding user:", userError)
      return NextResponse.json(
        { error: "Failed to find user" },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      console.log("[v0] No user found with email:", email)
      // On peut créer un utilisateur ou simplement enregistrer le paiement
      // Pour l'instant, on enregistre juste que le paiement est en attente
      return NextResponse.json({
        success: true,
        message: "Payment recorded, waiting for user to link account",
      })
    }

    const userId = users[0].id

    // Mettre à jour le profil utilisateur : VIP = true, sans date d'expiration
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        is_vip: true,
        vip_purchased_at: new Date().toISOString(),
        vip_expires_at: null, // Pas de date d'expiration
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] Error updating user VIP status:", updateError)
      return NextResponse.json(
        { error: "Failed to update VIP status" },
        { status: 500 }
      )
    }

    console.log("[v0] User VIP status updated:", userId)

    // Mettre à jour le statut du paiement
    await supabase
      .from("kofi_payments")
      .update({
        user_id: userId,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("kofi_transaction_id", kofiTransactionId)

    return NextResponse.json({
      success: true,
      message: "VIP status granted successfully",
      userId: userId,
    })
  } catch (error) {
    console.error("[v0] Ko-fi webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
