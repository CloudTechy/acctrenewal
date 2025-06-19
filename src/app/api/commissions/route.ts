import { NextRequest, NextResponse } from 'next/server'
import { getOwnerCommissions, getOwnerStats } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!ownerId) {
      return NextResponse.json({ error: 'Owner ID is required' }, { status: 400 })
    }

    // Get commission transactions
    const commissions = await getOwnerCommissions(ownerId, startDate || undefined, endDate || undefined)
    
    // Get owner statistics
    const dbStats = await getOwnerStats(ownerId, startDate || undefined, endDate || undefined)
    
    // Map snake_case to camelCase for frontend
    const stats = {
      totalCommissions: dbStats.total_commissions,
      totalTransactions: dbStats.total_transactions,
      monthlyCommissions: dbStats.monthlyCommissions,
      activeCustomers: dbStats.activeCustomers
    }
    
    return NextResponse.json({
      success: true,
      data: {
        commissions,
        stats
      }
    })

  } catch (error) {
    console.error('Error fetching commissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission data' },
      { status: 500 }
    )
  }
} 