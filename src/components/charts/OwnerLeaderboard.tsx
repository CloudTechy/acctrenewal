'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface OwnerData {
  id: string
  name: string
  email: string
  totalCommissions: number
  totalRevenue: number
  transactionCount: number
}

interface OwnerLeaderboardProps {
  data: OwnerData[]
  height?: number
  maxOwners?: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload?: {
      fullName?: string
      commissions?: number
      revenue?: number
      transactions?: number
    }
  }>
}

export default function OwnerLeaderboard({ data, height = 400, maxOwners = 10 }: OwnerLeaderboardProps) {
  const chartData = data.slice(0, maxOwners).map(owner => ({
    name: owner.name.length > 15 ? `${owner.name.substring(0, 15)}...` : owner.name,
    fullName: owner.name,
    commissions: owner.totalCommissions,
    revenue: owner.totalRevenue,
    transactions: owner.transactionCount
  }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm font-medium">{data?.fullName}</p>
          <p className="text-green-400 text-sm">
            Commissions: {formatCurrency(data?.commissions || 0)}
          </p>
          <p className="text-blue-400 text-sm">
            Revenue: {formatCurrency(data?.revenue || 0)}
          </p>
          <p className="text-gray-400 text-xs">
            Transactions: {data?.transactions || 0}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF" 
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#9CA3AF" 
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="commissions" 
            fill="#10B981"
            radius={[4, 4, 0, 0]}
            name="Commissions"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
} 