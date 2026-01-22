import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier que l'utilisateur est admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Récupérer toutes les transactions Ko-fi avec les infos utilisateur
    const { data: transactions, error } = await supabase
      .from('kofi_payments')
      .select(`
        id,
        transaction_id,
        user_id,
        amount,
        currency,
        status,
        payment_method,
        donor_name,
        message,
        created_at,
        processed_at,
        user_profiles!inner(
          id,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching Ko-fi transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Formater les transactions
    const formattedTransactions = (transactions || []).map((t: any) => ({
      id: t.id,
      transaction_id: t.transaction_id,
      user_id: t.user_id,
      user_email: t.user_profiles?.email || 'Unknown',
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      payment_method: t.payment_method,
      donor_name: t.donor_name,
      message: t.message,
      created_at: t.created_at,
      processed_at: t.processed_at,
    }))

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: formattedTransactions.length,
    })
  } catch (error) {
    console.error('[v0] Ko-fi transactions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
