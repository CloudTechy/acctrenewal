import { NextRequest, NextResponse } from 'next/server'
import { calculateKPIMetrics, calculateGeographicMetrics, calculateCustomerRetentionChart } from '@/lib/kpi'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeGeographic = searchParams.get('includeGeographic') === 'true'
    const includeRetention = searchParams.get('includeRetention') === 'true'

    // Calculate core KPI metrics
    const kpiMetrics = await calculateKPIMetrics(
      startDate || undefined, 
      endDate || undefined
    )

    const response: {
      success: boolean
      data: {
        kpi: typeof kpiMetrics
        geographic?: Awaited<ReturnType<typeof calculateGeographicMetrics>>
        retention?: Awaited<ReturnType<typeof calculateCustomerRetentionChart>>
      }
    } = {
      success: true,
      data: {
        kpi: kpiMetrics
      }
    }

    // Optionally include geographic metrics
    if (includeGeographic) {
      response.data.geographic = await calculateGeographicMetrics()
    }

    // Optionally include retention chart data
    if (includeRetention) {
      response.data.retention = await calculateCustomerRetentionChart(12)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching KPI data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch KPI data' 
      },
      { status: 500 }
    )
  }
} 