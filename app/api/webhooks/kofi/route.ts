import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const VIP_MIN_AMOUNT = 5

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    let body: any

    // 🔹 Parsing robuste pour tests Ko-fi ou vrais paiements
    try {
      body = JSON.parse(rawBody)
    } catch {
      const params = new URLSearchParams(rawBody)
      body = JSON.parse(params.get("data") || "{}")
    }

    console.log("[Ko-fi] Parsed body:", body)

    // 🔐 Vérification token
    const kofiToken = process.env.KOFI_VERIFICATION_TOKEN
    if (kofiToken && body.verification_token !== kofiToken) {
      console.error("[Ko-fi] Invalid verification token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 🧾 Types acceptés
    if (!["Donation", "Shop Order"].includes(body.type)) {
      console.log("[Ko-fi] Ignored type:", body.type)
      return NextResponse.json({ success: true })
    }

    // 💳 Données paiement
    const transactionId = body.kofi_transaction_id
    const amount = parseFloat(body.amount)
    const email = body.email || body.from_email || null

    if (!transactionId || !email || isNaN(amount)) {
      console.error("[Ko-fi] Invalid payment data")
      return NextResponse.json({ error: "Invalid payment" }, { status: 400 })
    }

    // 🧠 Init Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    )

    // 💾 ENREGISTRER TOUS LES PAIEMENTS
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("kofi_payments")
      .insert({
        kofi_transaction_id: transactionId,
        email,
        amount,
        currency: body.currency,
        raw_data: body,
        status: "received",
        processed_at: new Date().toISOString(),
      })
      .select()

    if (paymentError) {
      console.error("[Ko-fi] Error saving payment:", paymentError)
      return NextResponse.json({ error: "Failed to save payment" }, { status: 500 })
    }

    console.log("[Ko-fi] Payment recorded:", paymentRecord)

    // ❌ Si montant < VIP_MIN_AMOUNT → juste enregistrer
    if (amount < VIP_MIN_AMOUNT) {
      console.log("[Ko-fi] Payment below VIP threshold:", amount)
      return NextResponse.json({
        success: true,
        message: "Payment recorded, not VIP",
      })
    }

    // 👤 Chercher utilisateur
    const { data: user } = await supabase
      .from("user_profiles")
      .select("id, role, is_vip")
      .eq("email", email)
      .single()

    if (!user) {
      console.log("[Ko-fi] No user found for email:", email)
      return NextResponse.json({
        success: true,
        message: "Payment recorded, user not found",
      })
    }

    // ⭐ Mettre à jour VIP
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        role: "vip",
        is_vip: true,
        vip_purchased_at: new Date().toISOString(),
        vip_expires_at: null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[Ko-fi] Error updating VIP:", updateError)
      return NextResponse.json({ error: "Failed to update VIP" }, { status: 500 })
    }

    console.log("[Ko-fi] User upgraded to VIP:", user.id)

    // ✅ Mettre à jour le paiement avec user_id et status completed
    await supabase
      .from("kofi_payments")
      .update({ user_id: user.id, status: "completed" })
      .eq("kofi_transaction_id", transactionId)

    return NextResponse.json({
      success: true,
      message: "Payment recorded and VIP granted if applicable",
      userId: user.id,
    })
  } catch (err) {
    console.error("[Ko-fi] Webhook error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
