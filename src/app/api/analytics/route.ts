import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface OwnerLeaderboardItem {
  id: string
  name: string
  email: string
  totalCommissions: number
  totalRevenue: number
  transactionCount: number
}

interface ServicePlanItem {
  planName: string
  revenue: number
  commissions: number
  transactions: number
}

interface MonthlyTrendItem {
  month: string
  revenue: number
  commissions: number
  transactions: number
  customers: number
}

interface PlanData {
  service_plan_name: string
  amount_paid: number
  commission_amount: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter for queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFilter = (query: any) => {
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)
      return query
    }

    // 1. Overall Revenue & Commission Stats
    let revenueQuery = supabaseAdmin
      .from('renewal_transactions')
      .select('amount_paid, commission_amount, created_at')
      .eq('payment_status', 'success')

    revenueQuery = dateFilter(revenueQuery)
    const { data: transactions, error: revenueError } = await revenueQuery

    if (revenueError) {
      console.error('Error fetching revenue data:', revenueError)
      throw revenueError
    }

    const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount_paid, 0) || 0
    const totalCommissions = transactions?.reduce((sum, t) => sum + t.commission_amount, 0) || 0
    const totalTransactions = transactions?.length || 0

    // 2. Owner Leaderboard - Don't apply date filter to owner queries
    const { data: ownerStats, error: ownerError } = await supabaseAdmin
      .from('renewal_transactions')
      .select(`
        account_owner_id,
        commission_amount,
        amount_paid,
        created_at,
        account_owners!left(name, email, is_active)
      `)
      .eq('payment_status', 'success')
      .not('account_owner_id', 'is', null)

    if (ownerError) {
      console.error('Error fetching owner stats:', ownerError)
      throw ownerError
    }

    console.log('Owner stats raw data:', ownerStats?.slice(0, 2)) // Debug first 2 records

    // Group by owner and calculate totals
    const ownerMap: Record<string, OwnerLeaderboardItem> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ownerStats?.forEach((transaction: any) => {
      const ownerId = transaction.account_owner_id
      const ownerInfo = transaction.account_owners // This is an object with LEFT JOIN
      
      console.log('Processing transaction:', { 
        ownerId, 
        ownerInfo, 
        hasOwner: !!ownerInfo,
        isActive: ownerInfo?.is_active 
      })
      
      // Skip if no owner info is available OR owner is inactive
      if (!ownerInfo || !ownerId || !ownerInfo.is_active) {
        console.warn('Skipping transaction with missing/inactive owner:', { 
          ownerId, 
          hasOwnerInfo: !!ownerInfo,
          isActive: ownerInfo?.is_active 
        })
        return
      }
      
      // Apply date filter here instead of in the query
      if (startDate && transaction.created_at < startDate) return
      if (endDate && transaction.created_at > endDate) return
      
      if (!ownerMap[ownerId]) {
        ownerMap[ownerId] = {
          id: ownerId,
          name: ownerInfo.name || 'Unknown Owner',
          email: ownerInfo.email || 'No email',
          totalCommissions: 0,
          totalRevenue: 0,
          transactionCount: 0
        }
      }
      ownerMap[ownerId].totalCommissions += transaction.commission_amount
      ownerMap[ownerId].totalRevenue += transaction.amount_paid
      ownerMap[ownerId].transactionCount += 1
    })

    const ownerLeaderboard = Object.values(ownerMap)
      .sort((a, b) => b.totalCommissions - a.totalCommissions)

    console.log('Final owner leaderboard:', ownerLeaderboard)

    // 3. Monthly Trends (last 12 months)
    const monthlyTrends: MonthlyTrendItem[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      
      const nextMonth = new Date(date)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      
      const { data: monthData } = await supabaseAdmin
        .from('renewal_transactions')
        .select('amount_paid, commission_amount, username')
        .eq('payment_status', 'success')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextMonth.toISOString())

      const monthRevenue = monthData?.reduce((sum, t) => sum + t.amount_paid, 0) || 0
      const monthCommissions = monthData?.reduce((sum, t) => sum + t.commission_amount, 0) || 0
      const uniqueCustomers = new Set(monthData?.map(t => t.username)).size

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        commissions: monthCommissions,
        transactions: monthData?.length || 0,
        customers: uniqueCustomers
      })
    }

    // 4. Service Plan Performance
    const { data: planStats, error: planError } = await supabaseAdmin
      .from('renewal_transactions')
      .select('service_plan_name, amount_paid, commission_amount')
      .eq('payment_status', 'success')
      .not('service_plan_name', 'is', null)

    if (planError) {
      console.error('Error fetching plan stats:', planError)
    }

    const planMap: Record<string, ServicePlanItem> = {}
    planStats?.forEach((transaction: PlanData) => {
      const planName = transaction.service_plan_name || 'Unknown Plan'
      if (!planMap[planName]) {
        planMap[planName] = {
          planName,
          revenue: 0,
          commissions: 0,
          transactions: 0
        }
      }
      planMap[planName].revenue += transaction.amount_paid
      planMap[planName].commissions += transaction.commission_amount
      planMap[planName].transactions += 1
    })

    const servicePlanPerformance = Object.values(planMap)
      .sort((a, b) => b.revenue - a.revenue)

    // 5. Customer & Owner Counts
    const { count: totalCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })

    const { count: activeOwners } = await supabaseAdmin
      .from('account_owners')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: assignedCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .not('account_owner_id', 'is', null)

    // 6. Calculate business metrics
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    const commissionRate = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0
    const assignmentRate = (totalCustomers ?? 0) > 0 ? ((assignedCustomers ?? 0) / (totalCustomers ?? 0)) * 100 : 0

    // 7. Recent activity (last 10 transactions)
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('renewal_transactions')
      .select(`
        id,
        username,
        amount_paid,
        commission_amount,
        created_at,
        account_owners!left(name, is_active)
      `)
      .eq('payment_status', 'success')
      .not('account_owner_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (activityError) {
      console.error('Error fetching recent activity:', activityError)
    }

    console.log('Recent activity raw data:', recentActivity?.slice(0, 2)) // Debug first 2 records

    // Filter out transactions with inactive owners
    const filteredRecentActivity = recentActivity?.filter(activity => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const owner = activity.account_owners as any // This should be an object, not array
      console.log('Filtering recent activity:', { 
        activityId: activity.id, 
        owner, 
        hasOwner: !!owner,
        isActive: owner?.is_active 
      })
      return owner && owner.is_active
    }) || []

    console.log('Filtered recent activity:', filteredRecentActivity?.slice(0, 2))

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalCommissions,
          totalTransactions,
          averageTransactionValue,
          commissionRate,
          totalCustomers: totalCustomers ?? 0,
          activeOwners: activeOwners ?? 0,
          assignedCustomers: assignedCustomers ?? 0,
          assignmentRate
        },
        ownerLeaderboard: ownerLeaderboard.slice(0, 10), // Top 10 owners
        monthlyTrends,
        servicePlanPerformance: servicePlanPerformance.slice(0, 5), // Top 5 plans
        recentActivity: filteredRecentActivity
      }
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
} 