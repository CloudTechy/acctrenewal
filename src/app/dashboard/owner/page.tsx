'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  User,
  Clock
} from 'lucide-react'

interface CommissionData {
  id: string
  username: string
  service_plan_name: string
  amount_paid: number
  commission_amount: number
  payment_status: string
  created_at: string
  renewal_period_days: number
}

interface OwnerStats {
  totalCommissions: number
  totalTransactions: number
  monthlyCommissions: number
  activeCustomers: number
}

interface OwnerData {
  id: string
  name: string
  email: string
  commission_rate: number
}

export default function OwnerDashboard() {
  const [commissions, setCommissions] = useState<CommissionData[]>([])
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [owner, setOwner] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [owners, setOwners] = useState<OwnerData[]>([])
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  })

  // Fetch all owners for selection
  useEffect(() => {
    fetchOwners()
  }, [])

  // Fetch commission data when owner is selected
  useEffect(() => {
    if (selectedOwnerId) {
      fetchCommissionData()
    }
  }, [selectedOwnerId, dateRange])

  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners')
      const data = await response.json()
      if (data.success) {
        setOwners(data.data)
        // Auto-select first owner if available
        if (data.data.length > 0 && !selectedOwnerId) {
          setSelectedOwnerId(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching owners:', error)
    }
  }

  const fetchCommissionData = async () => {
    if (!selectedOwnerId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ownerId: selectedOwnerId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      const response = await fetch(`/api/commissions?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setCommissions(data.data.commissions)
        setStats(data.data.stats)
        
        // Get owner details
        const selectedOwner = owners.find(o => o.id === selectedOwnerId)
        setOwner(selectedOwner || null)
      }
    } catch (error) {
      console.error('Error fetching commission data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const downloadStatement = () => {
    if (!commissions.length || !owner) return
    
    const csvContent = [
      ['Date', 'Customer', 'Service Plan', 'Amount Paid', 'Commission', 'Status'],
      ...commissions.map(c => [
        formatDate(c.created_at),
        c.username,
        c.service_plan_name,
        c.amount_paid.toString(),
        c.commission_amount.toString(),
        c.payment_status
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commission-statement-${owner.name}-${dateRange.startDate}-${dateRange.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Commission Dashboard</h1>
          <p className="text-gray-400">Track your earnings and customer renewals</p>
        </div>

        {/* Owner Selection */}
        <Card className="mb-8 bg-gray-900/80 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Account Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Owner</label>
                <select 
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 min-w-[200px]"
                >
                  <option value="">Select an owner...</option>
                  {owners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} ({owner.email})
                    </option>
                  ))}
                </select>
              </div>
              
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
                onClick={fetchCommissionData}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!selectedOwnerId}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {!selectedOwnerId ? (
          <Card className="bg-gray-900/80 border-gray-700">
            <CardContent className="text-center py-12">
              <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Please select an account owner to view commission data</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card className="bg-gray-900/80 border-gray-700">
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading commission data...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Owner Info */}
            {owner && (
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{owner.name}</h2>
                      <p className="text-blue-100">{owner.email}</p>
                      <p className="text-blue-100">Commission Rate: {owner.commission_rate}%</p>
                    </div>
                    <Button 
                      onClick={downloadStatement}
                      variant="outline"
                      className="border-white text-white hover:bg-white hover:text-blue-600"
                      disabled={!commissions.length}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Statement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm">Total Commissions</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</p>
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
                          <p className="text-blue-100 text-sm">This Period</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.monthlyCommissions)}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-200" />
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
                          <p className="text-purple-100 text-sm">Active Customers</p>
                          <p className="text-2xl font-bold">{stats.activeCustomers}</p>
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
                          <p className="text-orange-100 text-sm">Total Renewals</p>
                          <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-200" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Commission History Table */}
            <Card className="bg-gray-900/80 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Commission History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No commission data found for the selected period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="pb-3 text-gray-300 font-medium">Date</th>
                          <th className="pb-3 text-gray-300 font-medium">Customer</th>
                          <th className="pb-3 text-gray-300 font-medium">Service Plan</th>
                          <th className="pb-3 text-gray-300 font-medium">Amount Paid</th>
                          <th className="pb-3 text-gray-300 font-medium">Commission</th>
                          <th className="pb-3 text-gray-300 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-300">
                        {commissions.map((commission) => (
                          <motion.tr
                            key={commission.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b border-gray-800 hover:bg-gray-800/50"
                          >
                            <td className="py-4">{formatDate(commission.created_at)}</td>
                            <td className="py-4 font-medium">{commission.username}</td>
                            <td className="py-4">{commission.service_plan_name}</td>
                            <td className="py-4">{formatCurrency(commission.amount_paid)}</td>
                            <td className="py-4 font-semibold text-green-400">
                              {formatCurrency(commission.commission_amount)}
                            </td>
                            <td className="py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                commission.payment_status === 'success' 
                                  ? 'bg-green-900 text-green-300' 
                                  : 'bg-yellow-900 text-yellow-300'
                              }`}>
                                {commission.payment_status}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 