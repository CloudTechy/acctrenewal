'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ServicePlanData {
  planName: string
  revenue: number
  commissions: number
  transactions: number
}

interface RevenueBreakdownProps {
  data: ServicePlanData[]
  height?: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload?: {
      planName?: string
      revenue?: number
      commissions?: number
      transactions?: number
    }
  }>
}

interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function RevenueBreakdown({ data, height = 400 }: RevenueBreakdownProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const chartData = data.map((plan, index) => ({
    ...plan,
    fill: COLORS[index % COLORS.length]
  }))

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm font-medium">{data?.planName}</p>
          <p className="text-blue-400 text-sm">
            Revenue: {formatCurrency(data?.revenue || 0)}
          </p>
          <p className="text-green-400 text-sm">
            Commissions: {formatCurrency(data?.commissions || 0)}
          </p>
          <p className="text-gray-400 text-xs">
            Transactions: {data?.transactions || 0}
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) => {
    if (percent < 0.05) return null // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>No service plan data available</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={Math.min(height * 0.35, 120)}
            fill="#8884d8"
            dataKey="revenue"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ color: '#D1D5DB', fontSize: '12px' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, entry: any) => (
              <span style={{ color: entry.color }}>
                {entry.payload?.planName}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
} 