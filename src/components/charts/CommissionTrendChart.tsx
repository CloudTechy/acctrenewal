'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendData {
  month: string
  revenue: number
  commissions: number
  transactions: number
  customers: number
}

interface CommissionTrendChartProps {
  data: TrendData[]
  height?: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    color: string
    name: string
    value: number
    dataKey: string
  }>
  label?: string
}

export default function CommissionTrendChart({ data, height = 300 }: CommissionTrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'customers' || entry.dataKey === 'transactions' 
                ? entry.value 
                : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            stroke="#9CA3AF" 
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            yAxisId="left"
            stroke="#9CA3AF" 
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#9CA3AF" 
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ color: '#D1D5DB' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={3}
            name="Revenue"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="commissions"
            stroke="#10B981"
            strokeWidth={3}
            name="Commissions"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="customers"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Customers"
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#F59E0B', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 