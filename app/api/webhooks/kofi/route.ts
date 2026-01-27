import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * ✅ WEBHOOK KOFI ULTRA-SIMPLE
 * Ce webhook enregistre TOUT ce que Ko-fi envoie
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 📥 ÉTAPE 1: Récupérer le body
    console.log("🔵 [Ko-fi] Webhook received at", new Date().toISOString())
    
    const rawBody = await request.text()
    console.log("📦 [Ko-fi] Raw body length:", rawBody.length)
    
    // 📋 ÉTAPE 2: Parser le body
    let body: any
    
    try {
      // Tentative 1: JSON direct
      body = JSON.parse(rawBody)
      console.log("✅ [Ko-fi] Parsed as direct JSON")
    } catch {
      // Tentative 2: URL encoded avec param "data"
      const params = new URLSearchParams(rawBody)
      const dataParam = params.get("data")
      
      if (!dataParam) {
        console.error("❌ [Ko-fi] No 'data' param in body")
        return NextResponse.json(
          { error: "Invalid payload format" },
          { status: 400 }
        )
      }
      
      body = JSON.parse(dataParam)
      console.log("✅ [Ko-fi] Parsed from 'data' param")
    }
    
    console.log("📄 [Ko-fi] Payload:", JSON.stringify(body, null, 2))
    
    // 🔐 ÉTAPE 3: Vérification token (optionnelle pour debug)
    const KOFI_TOKEN = process.env.KOFI_VERIFICATION_TOKEN
    if (KOFI_TOKEN && body.verification_token !== KOFI_TOKEN) {
      console.error("❌ [Ko-fi] Invalid verification token")
      console.log("Expected:", KOFI_TOKEN)
      console.log("Received:", body.verification_token)
      
      // Pour le debug, on continue quand même mais on log
      console.log("⚠️ [Ko-fi] Continuing anyway for debug purposes")
    }
    
    // 📝 ÉTAPE 4: Extraire les données
    const transactionId = body.kofi_transaction_id || `test_${Date.now()}`
    const messageId = body.message_id || body.kofi_transaction_id || `msg_${Date.now()}`
    const email = body.email || "unknown@example.com"
    const donorName = body.from_name || "Anonymous"
    const amount = parseFloat(body.amount || "0")
    const currency = body.currency || "USD"
    const paymentType = body.type || "Donation"
    const timestamp = body.timestamp || new Date().toISOString()
    
    console.log("💰 [Ko-fi] Transaction details:", {
      transactionId,
      email,
      amount,
      currency,
      paymentType
    })
    
    // 🗄️ ÉTAPE 5: Connexion Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ [Ko-fi] Missing Supabase credentials")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    console.log("🔌 [Ko-fi] Supabase client created")
    
    // 🔍 ÉTAPE 6: Vérifier si la transaction existe déjà
    const { data: existing } = await supabase
      .from("kofi_transactions")
      .select("id")
      .eq("kofi_transaction_id", transactionId)
      .single()
    
    if (existing) {
      console.log("⚠️ [Ko-fi] Transaction already exists:", existing.id)
      return NextResponse.json({
        success: true,
        message: "Transaction already processed",
        id: existing.id
      })
    }
    
    // 💾 ÉTAPE 7: Insérer dans la BDD
    console.log("💾 [Ko-fi] Inserting into database...")
    
    const { data, error } = await supabase
      .from("kofi_transactions")
      .insert({
        kofi_transaction_id: transactionId,
        message_id: messageId,
        email: email,
        donor_name: donorName,
        amount: amount,
        currency: currency,
        payment_type: paymentType,
        status: "received",
        kofi_timestamp: timestamp,
        raw_payload: body, // Stocke tout le payload
      })
      .select()
      .single()
    
    if (error) {
      console.error("❌ [Ko-fi] Database error:", error)
      return NextResponse.json(
        {
          error: "Database insert failed",
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }
    
    console.log("✅ [Ko-fi] Successfully saved to database:", data.id)
    console.log(`⏱️ [Ko-fi] Total time: ${Date.now() - startTime}ms`)
    
    // 🎉 ÉTAPE 8: Réponse de succès
    return NextResponse.json({
      success: true,
      message: "Transaction received and saved",
      id: data.id,
      transaction_id: transactionId,
      amount: amount,
      email: email
    })
    
  } catch (error) {
    console.error("💥 [Ko-fi] Unexpected error:", error)
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint pour vérifier que le webhook est accessible
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Ko-fi webhook endpoint is running",
    timestamp: new Date().toISOString()
  })
}
