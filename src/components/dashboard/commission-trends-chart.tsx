'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface TrendData {
  month: string
  sales: number
  commissions: number
  count: number
  rate: number
}

interface CommissionTrendsChartProps {
  data: TrendData[]
  type?: 'line' | 'area'
}

export function CommissionTrendsChart({ data, type = 'area' }: CommissionTrendsChartProps) {
  // Format month labels (e.g., "2024-01" -> "Jan 2024")
  const formattedData = data.map((item) => {
    const [year, month] = item.month.split('-')
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' })
    return {
      ...item,
      monthLabel: `${monthName} ${year}`,
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium mb-2">{payload[0].payload.monthLabel}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-sm">Invoices: {formatCurrency(payload[0].payload.sales)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} />
            <span className="text-sm">Payments: {formatCurrency(payload[0].payload.commissions)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--chart-3)' }} />
            <span className="text-sm">Collection Rate: {payload[0].payload.rate.toFixed(2)}%</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {payload[0].payload.count} transactions
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AR Performance Trends</CardTitle>
        <CardDescription>Invoices and payments received over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          {type === 'area' ? (
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCommissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthLabel"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--chart-1)"
                fill="url(#colorSales)"
                name="Invoices"
              />
              <Area
                type="monotone"
                dataKey="commissions"
                stroke="var(--chart-2)"
                fill="url(#colorCommissions)"
                name="Payments"
              />
            </AreaChart>
          ) : (
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="var(--chart-1)"
                strokeWidth={2}
                name="Invoices"
              />
              <Line
                type="monotone"
                dataKey="commissions"
                stroke="var(--chart-2)"
                strokeWidth={2}
                name="Payments"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
