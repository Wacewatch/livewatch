import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // ✅ KO-FI PARSING CORRECT (OBLIGATOIRE)
    const rawBody = await request.text()
    const params = new URLSearchParams(rawBody)
    const body = JSON.parse(params.get("data") || "{}")

    console.log("[v0] Ko-fi webhook received:", body)

    // ✅ Vérification du token Ko-fi
    const kofiToken = process.env.KOFI_VERIFICATION_TOKEN
    if (kofiToken && body.verification_token !== kofiToken) {
      console.error("[v0] Ko-fi verification token mismatch")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ✅ Vérifier le type de paiement (laisser large en prod)
    if (!["Donation", "Shop Order"].includes(body.type)) {
      console.log("[v0] Ko-fi webhook type ignored:", body.type)
      return NextResponse.json({ success: true })
    }

    // ✅ Extraction des données (robuste)
    const kofiTransactionId = body.kofi_transaction_id
    const amount = body.amount
    const email =
      body.email ||
      body.from_email ||
      body.message || null

    const senderName = body.from_name || null
    const isPublic = body.is_public ?? false

    if (!kofiTransactionId || !email) {
      console.error("[v0] Missing required Ko-fi data")
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      )
    }

    // ✅ Initialisation Supabase (service role OK)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // ✅ Enregistrement du paiement Ko-fi
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("kofi_payments")
      .insert({
        kofi_transaction_id: kofiTransactionId,
        email: email,
        amount: parseFloat(amount),
        sender_name: senderName,
        is_public: isPublic,
        raw_data: body,
        status: "pending",
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.error("[v0] Error saving Ko-fi payment:", paymentError)
      return NextResponse.json(
        { error: "Failed to save payment record" },
        { status: 500 }
      )
    }

    console.log("[v0] Ko-fi payment recorded:", paymentRecord)

    // ✅ Recherche utilisateur
    const { data: users, error: userError } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", email)
      .limit(1)

    if (userError) {
      console.error("[v0] Error finding user:", userError)
      return NextResponse.json(
        { error: "Failed to find user" },
        { status: 500 }
      )
    }

    // 🟡 Utilisateur pas encore créé
    if (!users || users.length === 0) {
      console.log("[v0] No user found with email:", email)
      return NextResponse.json({
        success: true,
        message: "Payment recorded, waiting for user account",
      })
    }

    const userId = users[0].id

    // ✅ Mise à jour VIP
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        is_vip: true,
        vip_purchased_at: new Date().toISOString(),
        vip_expires_at: null,
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

    // ✅ Finaliser le paiement
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
      userId,
    })
  } catch (error) {
    console.error("[v0] Ko-fi webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
