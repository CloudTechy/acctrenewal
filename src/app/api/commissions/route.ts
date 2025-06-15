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
    const stats = await getOwnerStats(ownerId)

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