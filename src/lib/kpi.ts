import { supabaseAdmin } from './supabase'

interface KPIMetrics {
  arpu: number // Average Revenue Per User
  ltv: number // Customer Lifetime Value
  mrr: number // Monthly Recurring Revenue
  churnRate: number // Monthly churn rate
  retentionRate: number // Customer retention rate
  avgDaysBetweenRenewals: number
  totalActiveCustomers: number
  revenueGrowthRate: number
  commissionEfficiency: number
}

interface GeographicMetrics {
  city?: string
  state?: string
  country?: string
  revenue: number
  commissions: number
  customerCount: number
}

interface TransactionWithCustomer {
  amount_paid: number
  commission_amount: number
  username: string
  customers: {
    city?: string
    state?: string
    country?: string
  }
}

export async function calculateKPIMetrics(startDate?: string, endDate?: string): Promise<KPIMetrics> {
  try {
    // Get current period transactions
    let currentQuery = supabaseAdmin
      .from('renewal_transactions')
      .select('amount_paid, commission_amount, username, created_at, renewal_period_days')
      .eq('payment_status', 'success')

    if (startDate) currentQuery = currentQuery.gte('created_at', startDate)
    if (endDate) currentQuery = currentQuery.lte('created_at', endDate)

    const { data: currentTransactions } = await currentQuery

    // Get previous period for comparison (same duration before start date)
    let previousPeriodStart = ''
    let previousPeriodEnd = ''
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const periodDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - periodDays)
      
      previousPeriodStart = prevStart.toISOString()
      previousPeriodEnd = prevEnd.toISOString()
    }

    const { data: previousTransactions } = await supabaseAdmin
      .from('renewal_transactions')
      .select('amount_paid')
      .eq('payment_status', 'success')
      .gte('created_at', previousPeriodStart)
      .lte('created_at', previousPeriodEnd)

    // Current period metrics
    const totalRevenue = currentTransactions?.reduce((sum, t) => sum + t.amount_paid, 0) || 0
    const totalCommissions = currentTransactions?.reduce((sum, t) => sum + t.commission_amount, 0) || 0
    const uniqueCustomers = new Set(currentTransactions?.map(t => t.username)).size
    const totalTransactions = currentTransactions?.length || 0

    // Previous period metrics
    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + t.amount_paid, 0) || 0

    // 1. Average Revenue Per User (ARPU)
    const arpu = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0

    // 2. Calculate Monthly Recurring Revenue (MRR) estimate
    // Assume average renewal period and extrapolate to monthly
    const avgRenewalPeriod = (currentTransactions && currentTransactions.length > 0)
      ? currentTransactions.reduce((sum, t) => sum + (t.renewal_period_days || 30), 0) / currentTransactions.length
      : 30
    
    const mrr = totalRevenue * (30 / avgRenewalPeriod)

    // 3. Customer Lifetime Value (LTV) estimate
    // LTV = (Average Order Value × Purchase Frequency × Gross Margin × Lifespan)
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    const purchaseFrequency = 365 / avgRenewalPeriod // Purchases per year
    const grossMargin = 0.7 // Assume 70% gross margin
    const estimatedLifespan = 2 // Assume 2 years average customer lifespan
    const ltv = avgOrderValue * purchaseFrequency * grossMargin * estimatedLifespan

    // 4. Revenue Growth Rate
    const revenueGrowthRate = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    // 5. Commission Efficiency (commission ratio)
    const commissionEfficiency = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0

    // 6. Calculate churn and retention (need historical data)
    const { data: allCustomers } = await supabaseAdmin
      .from('customers')
      .select('username, created_at, last_renewal_date')

    const totalActiveCustomers = allCustomers?.length || 0

    // Simple churn calculation based on customers who haven't renewed in last 60 days
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    
    const activeCustomers = allCustomers?.filter(customer => {
      if (!customer.last_renewal_date) return false
      return new Date(customer.last_renewal_date) > sixtyDaysAgo
    }) || []

    const churnedCustomers = totalActiveCustomers - activeCustomers.length
    const churnRate = totalActiveCustomers > 0 ? (churnedCustomers / totalActiveCustomers) * 100 : 0
    const retentionRate = 100 - churnRate

    // 7. Average days between renewals
    const avgDaysBetweenRenewals = avgRenewalPeriod

    return {
      arpu: Math.round(arpu * 100) / 100,
      ltv: Math.round(ltv * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
      avgDaysBetweenRenewals: Math.round(avgDaysBetweenRenewals),
      totalActiveCustomers: activeCustomers.length,
      revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
      commissionEfficiency: Math.round(commissionEfficiency * 100) / 100
    }

  } catch (error) {
    console.error('Error calculating KPI metrics:', error)
    return {
      arpu: 0,
      ltv: 0,
      mrr: 0,
      churnRate: 0,
      retentionRate: 0,
      avgDaysBetweenRenewals: 0,
      totalActiveCustomers: 0,
      revenueGrowthRate: 0,
      commissionEfficiency: 0
    }
  }
}

export async function calculateGeographicMetrics(): Promise<GeographicMetrics[]> {
  try {
    // Get all customers with their transactions
    const { data: transactions } = await supabaseAdmin
      .from('renewal_transactions')
      .select(`
        amount_paid,
        commission_amount,
        username,
        customers!inner(city, state, country)
      `)
      .eq('payment_status', 'success')

    if (!transactions) return []

    // Group by location
    const locationMap: Record<string, GeographicMetrics> = {}

    transactions.forEach((transaction: TransactionWithCustomer) => {
      const customer = transaction.customers
      const locationKey = `${customer?.city || 'Unknown'}, ${customer?.state || 'Unknown'}, ${customer?.country || 'Unknown'}`
      
      if (!locationMap[locationKey]) {
        locationMap[locationKey] = {
          city: customer?.city,
          state: customer?.state,
          country: customer?.country,
          revenue: 0,
          commissions: 0,
          customerCount: 0
        }
      }

      locationMap[locationKey].revenue += transaction.amount_paid
      locationMap[locationKey].commissions += transaction.commission_amount
      locationMap[locationKey].customerCount += 1
    })

    return Object.values(locationMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10 locations

  } catch (error) {
    console.error('Error calculating geographic metrics:', error)
    return []
  }
}

export async function calculateCustomerRetentionChart(months: number = 12): Promise<Array<{
  month: string
  newCustomers: number
  returningCustomers: number
  churnedCustomers: number
  retentionRate: number
}>> {
  try {
    const retentionData = []

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      
      const nextMonth = new Date(date)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Get transactions for this month
      const { data: monthTransactions } = await supabaseAdmin
        .from('renewal_transactions')
        .select('username, created_at')
        .eq('payment_status', 'success')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextMonth.toISOString())

      // Get transactions for previous month
      const prevMonth = new Date(date)
      prevMonth.setMonth(prevMonth.getMonth() - 1)
      const { data: prevMonthTransactions } = await supabaseAdmin
        .from('renewal_transactions')
        .select('username')
        .eq('payment_status', 'success')
        .gte('created_at', prevMonth.toISOString())
        .lt('created_at', date.toISOString())

      const currentCustomers = new Set(monthTransactions?.map(t => t.username) || [])
      const previousCustomers = new Set(prevMonthTransactions?.map(t => t.username) || [])

      const newCustomers = Array.from(currentCustomers).filter(customer => 
        !previousCustomers.has(customer)
      ).length

      const returningCustomers = Array.from(currentCustomers).filter(customer => 
        previousCustomers.has(customer)
      ).length

      const churnedCustomers = Array.from(previousCustomers).filter(customer => 
        !currentCustomers.has(customer)
      ).length

      const retentionRate = previousCustomers.size > 0 
        ? (returningCustomers / previousCustomers.size) * 100 
        : 0

      retentionData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        newCustomers,
        returningCustomers,
        churnedCustomers,
        retentionRate: Math.round(retentionRate * 100) / 100
      })
    }

    return retentionData

  } catch (error) {
    console.error('Error calculating retention chart:', error)
    return []
  }
} 