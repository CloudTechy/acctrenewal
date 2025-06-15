import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Check transactions with owner IDs
    const { data: transactions } = await supabaseAdmin
      .from('renewal_transactions')
      .select('id, username, account_owner_id, payment_status')
      .eq('payment_status', 'success')
      .limit(5)

    // Check account owners
    const { data: owners } = await supabaseAdmin
      .from('account_owners')
      .select('id, name, email, is_active')
      .limit(5)

    // Check transaction with owner join
    const { data: joinedData } = await supabaseAdmin
      .from('renewal_transactions')
      .select(`
        id,
        username,
        account_owner_id,
        account_owners!left(id, name, email, is_active)
      `)
      .eq('payment_status', 'success')
      .limit(3)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        owners,
        joinedData
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed' },
      { status: 500 }
    )
  }
} 