import { NextResponse } from 'next/server'
import { getHotspotCustomerCounts } from '@/lib/database'

export async function GET() {
  try {
    // Get hotspot customer counts for all locations
    const counts = await getHotspotCustomerCounts()
    
    return NextResponse.json({
      success: true,
      counts,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching hotspot customer counts:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch hotspot customer counts',
        counts: {}
      },
      { status: 500 }
    )
  }
} 