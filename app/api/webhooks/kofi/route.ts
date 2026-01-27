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
    const paymentType = body.type || "Donation"
    if (!["Donation", "Shop Order", "Subscription", "Commission"].includes(paymentType)) {
      console.log("[Ko-fi] Ignored type:", paymentType)
      return NextResponse.json({ success: true, message: "Type ignored" })
    }

    // 💳 Données paiement - extraction complète
    const transactionId = body.kofi_transaction_id || `kofi_${Date.now()}`
    const messageId = body.message_id || transactionId // message_id est requis
    const amount = parseFloat(body.amount || "0")
    const email = body.email || body.from_email || null
    const fromName = body.from_name || "Anonymous"
    const message = body.message || null
    const currency = body.currency || "USD"
    const isPublic = body.is_public !== false
    const isSubscription = body.is_subscription_payment === true
    const isFirstSubscription = body.is_first_subscription_payment === true
    const tierName = body.tier_name || null
    const verificationToken = body.verification_token || null
    const timestamp = body.timestamp || new Date().toISOString()

    // Validation des données essentielles
    if (!transactionId || !email || isNaN(amount)) {
      console.error("[Ko-fi] Invalid payment data:", { transactionId, email, amount })
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 })
    }

    console.log("[Ko-fi] Processing payment:", {
      transactionId,
      email,
      amount,
      type: paymentType,
      messageId,
    })

    // 🧠 Init Supabase avec service role
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

    // 🔍 Vérifier si la transaction existe déjà
    const { data: existingPayment } = await supabase
      .from("kofi_payments")
      .select("id")
      .eq("kofi_transaction_id", transactionId)
      .single()

    if (existingPayment) {
      console.log("[Ko-fi] Transaction already processed:", transactionId)
      return NextResponse.json({
        success: true,
        message: "Transaction already processed",
      })
    }

    // 💾 ENREGISTRER LE PAIEMENT avec TOUTES les colonnes requises
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("kofi_payments")
      .insert({
        kofi_transaction_id: transactionId,
        transaction_id: transactionId, // Utiliser le même ID
        message_id: messageId, // REQUIS
        email,
        amount: amount.toString(), // La colonne est de type text
        currency,
        from_name: fromName,
        donor_name: fromName, // Dupliquer pour compatibilité
        message,
        type: paymentType, // REQUIS
        is_public: isPublic,
        is_subscription_payment: isSubscription,
        is_first_subscription_payment: isFirstSubscription,
        tier_name: tierName,
        verification_token: verificationToken,
        timestamp, // REQUIS
        status: "received",
        payment_method: "Ko-fi",
        processed_at: new Date().toISOString(),
      })
      .select()

    if (paymentError) {
      console.error("[Ko-fi] Error saving payment:", paymentError)
      return NextResponse.json(
        { error: "Failed to save payment", details: paymentError.message },
        { status: 500 }
      )
    }

    console.log("[Ko-fi] ✅ Payment recorded successfully:", paymentRecord?.[0]?.id)

    // ❌ Si montant < VIP_MIN_AMOUNT → juste enregistrer
    if (amount < VIP_MIN_AMOUNT) {
      console.log("[Ko-fi] Payment below VIP threshold:", amount)
      return NextResponse.json({
        success: true,
        message: "Payment recorded, amount below VIP threshold",
        paymentId: paymentRecord?.[0]?.id,
      })
    }

    // 👤 Chercher utilisateur par email
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id, role, is_vip, email")
      .eq("email", email)
      .single()

    if (userError || !user) {
      console.log("[Ko-fi] No user found for email:", email, userError?.message)
      return NextResponse.json({
        success: true,
        message: "Payment recorded, user not found in database",
        paymentId: paymentRecord?.[0]?.id,
      })
    }

    console.log("[Ko-fi] User found:", user.id)

    // ⭐ Mettre à jour VIP status
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        role: "vip",
        is_vip: true,
        vip_purchased_at: new Date().toISOString(),
        vip_expires_at: null, // Permanent VIP
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[Ko-fi] Error updating VIP status:", updateError)
      return NextResponse.json(
        { error: "Failed to update VIP status", details: updateError.message },
        { status: 500 }
      )
    }

    console.log("[Ko-fi] ⭐ User upgraded to VIP:", user.id)

    // ✅ Mettre à jour le paiement avec user_id et status completed
    const { error: linkError } = await supabase
      .from("kofi_payments")
      .update({
        user_id: user.id,
        status: "completed",
      })
      .eq("kofi_transaction_id", transactionId)

    if (linkError) {
      console.error("[Ko-fi] Error linking payment to user:", linkError)
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed and VIP granted",
      userId: user.id,
      paymentId: paymentRecord?.[0]?.id,
      vipGranted: true,
    })
  } catch (err) {
    console.error("[Ko-fi] Webhook error:", err)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
