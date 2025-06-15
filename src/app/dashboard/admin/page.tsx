'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CommissionTrendChart from '@/components/charts/CommissionTrendChart'
import OwnerLeaderboard from '@/components/charts/OwnerLeaderboard'
import RevenueBreakdown from '@/components/charts/RevenueBreakdown'
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Building2,
  Download,
  Filter,
  BarChart3,
  Crown,
  Activity,
  PieChart,
  Target,
  Clock,
  Award,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

interface AnalyticsOverview {
  totalRevenue: number
  totalCommissions: number
  totalTransactions: number
  averageTransactionValue: number
  commissionRate: number
  totalCustomers: number
  activeOwners: number
  assignedCustomers: number
  assignmentRate: number
}

interface OwnerLeaderboardItem {
  id: string
  name: string
  email: string
  totalCommissions: number
  totalRevenue: number
  transactionCount: number
}

interface MonthlyTrendItem {
  month: string
  revenue: number
  commissions: number
  transactions: number
}

interface ServicePlanItem {
  planName: string
  revenue: number
  commissions: number
  transactions: number
}

interface RecentActivityItem {
  id: string
  username: string
  amount_paid: number
  commission_amount: number
  created_at: string
  account_owners: { name: string }[]
}

interface AnalyticsData {
  overview: AnalyticsOverview
  ownerLeaderboard: OwnerLeaderboardItem[]
  monthlyTrends: MonthlyTrendItem[]
  servicePlanPerformance: ServicePlanItem[]
  recentActivity: RecentActivityItem[]
}

interface KPIMetrics {
  arpu: number
  ltv: number
  mrr: number
  churnRate: number
  retentionRate: number
  avgDaysBetweenRenewals: number
  totalActiveCustomers: number
  revenueGrowthRate: number
  commissionEfficiency: number
}

interface KPIData {
  kpi: KPIMetrics
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAnalytics()
    fetchKPIData()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      const response = await fetch(`/api/analytics?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKPIData = async () => {
    setKpiLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      const response = await fetch(`/api/kpi?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setKpiData(result.data)
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error)
    } finally {
      setKpiLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportLeaderboard = () => {
    if (!data?.ownerLeaderboard) return
    
    const csvContent = [
      ['Rank', 'Owner Name', 'Email', 'Total Commissions', 'Total Revenue', 'Transactions'],
      ...data.ownerLeaderboard.map((owner, index) => [
        (index + 1).toString(),
        owner.name,
        owner.email,
        formatCurrency(owner.totalCommissions),
        formatCurrency(owner.totalRevenue),
        owner.transactionCount.toString()
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `owner-leaderboard-${dateRange.startDate}-${dateRange.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Failed to load analytics data</p>
          <Button onClick={fetchAnalytics} className="mt-4">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Advanced Analytics Dashboard</h1>
          <p className="text-gray-400">Enterprise-grade business intelligence and KPI tracking</p>
        </div>

        {/* Date Filter */}
        <Card className="mb-8 bg-gray-900/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Analytics Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2"
                />
              </div>
              
              <Button 
                onClick={() => {
                  fetchAnalytics()
                  fetchKPIData()
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Update Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metrics Row */}
        {kpiData && !kpiLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-xs">ARPU</p>
                      <p className="text-lg font-bold">{formatCurrency(kpiData.kpi.arpu)}</p>
                      <p className="text-indigo-100 text-xs">Avg Revenue/User</p>
                    </div>
                    <Target className="h-6 w-6 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-xs">LTV</p>
                      <p className="text-lg font-bold">{formatCurrency(kpiData.kpi.ltv)}</p>
                      <p className="text-emerald-100 text-xs">Lifetime Value</p>
                    </div>
                    <Award className="h-6 w-6 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-r from-violet-500 to-violet-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-xs">MRR</p>
                      <p className="text-lg font-bold">{formatCurrency(kpiData.kpi.mrr)}</p>
                      <p className="text-violet-100 text-xs">Monthly Recurring</p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-violet-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-xs">Retention</p>
                      <div className="flex items-center gap-1">
                        <p className="text-lg font-bold">{formatPercent(kpiData.kpi.retentionRate)}</p>
                        {getTrendIcon(kpiData.kpi.revenueGrowthRate)}
                      </div>
                      <p className="text-amber-100 text-xs">Customer Retention</p>
                    </div>
                    <Users className="h-6 w-6 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-xs">Growth</p>
                      <div className="flex items-center gap-1">
                        <p className="text-lg font-bold">{formatPercent(kpiData.kpi.revenueGrowthRate)}</p>
                        {getTrendIcon(kpiData.kpi.revenueGrowthRate)}
                      </div>
                      <p className="text-rose-100 text-xs">Revenue Growth</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-rose-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</p>
                    <p className="text-green-100 text-xs">
                      Avg: {formatCurrency(data.overview.averageTransactionValue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Commissions</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.overview.totalCommissions)}</p>
                    <p className="text-blue-100 text-xs">
                      Rate: {formatPercent(data.overview.commissionRate)}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Total Customers</p>
                    <p className="text-2xl font-bold">{data.overview.totalCustomers}</p>
                    <p className="text-purple-100 text-xs">
                      Assigned: {formatPercent(data.overview.assignmentRate)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Active Owners</p>
                    <p className="text-2xl font-bold">{data.overview.activeOwners}</p>
                    <p className="text-orange-100 text-xs">
                      Transactions: {data.overview.totalTransactions}
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trends Chart */}
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monthly Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommissionTrendChart data={data.monthlyTrends} height={350} />
            </CardContent>
          </Card>

          {/* Owner Leaderboard Chart */}
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <Button 
                  onClick={exportLeaderboard}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <OwnerLeaderboard data={data.ownerLeaderboard} height={350} maxOwners={8} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Service Plan Performance */}
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Revenue by Service Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueBreakdown data={data.servicePlanPerformance} height={350} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Commission Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No recent activity found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data.recentActivity.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-all"
                    >
                      <div>
                        <p className="font-medium text-white text-sm">{activity.username}</p>
                        <p className="text-xs text-gray-400">{formatDate(activity.created_at)}</p>
                        <p className="text-xs text-gray-400">
                          Owner: {activity.account_owners?.[0]?.name || 'No owner'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-300">{formatCurrency(activity.amount_paid)}</p>
                        <p className="text-sm font-semibold text-green-400">
                          {formatCurrency(activity.commission_amount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 