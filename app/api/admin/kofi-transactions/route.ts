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

    // Récupérer toutes les transactions Ko-fi
    const { data: transactions, error } = await supabase
      .from('kofi_payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching Ko-fi transactions:', error)
      return NextResponse.json({
        success: true,
        transactions: [],
        total: 0,
        message: 'Pas de transactions Ko-fi trouvées',
      })
    }

    // Récupérer les emails des utilisateurs si user_id est disponible
    let formattedTransactions = (transactions || [])

    if (formattedTransactions.length > 0 && transactions[0].user_id) {
      const userIds = [...new Set(formattedTransactions.map(t => t.user_id))]
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      const userMap = (users || []).reduce((acc: any, u: any) => {
        acc[u.id] = u.email
        return acc
      }, {})

      formattedTransactions = formattedTransactions.map((t: any) => ({
        id: t.id,
        transaction_id: t.transaction_id,
        user_id: t.user_id,
        user_email: userMap[t.user_id] || 'Unknown',
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        payment_method: t.payment_method,
        donor_name: t.donor_name,
        message: t.message,
        created_at: t.created_at,
        processed_at: t.processed_at,
      }))
    } else {
      formattedTransactions = formattedTransactions.map((t: any) => ({
        id: t.id,
        transaction_id: t.transaction_id,
        user_id: t.user_id,
        user_email: 'Unknown',
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        payment_method: t.payment_method,
        donor_name: t.donor_name,
        message: t.message,
        created_at: t.created_at,
        processed_at: t.processed_at,
      }))
    }

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: formattedTransactions.length,
    })
  } catch (error) {
    console.error('[v0] Ko-fi transactions API error:', error)
    return NextResponse.json({
      success: true,
      transactions: [],
      total: 0,
      message: 'Erreur lors de la récupération des transactions',
    })
  }
}
