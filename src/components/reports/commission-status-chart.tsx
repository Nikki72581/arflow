'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CommissionStatusChartProps {
  pending: number
  approved: number
  paid: number
}

const COLORS = {
  pending: '#eab308', // yellow-500
  approved: '#3b82f6', // blue-500
  paid: '#22c55e', // green-500
}

export function CommissionStatusChart({ pending, approved, paid }: CommissionStatusChartProps) {
  const data = [
    { name: 'Open', value: pending, color: COLORS.pending },
    { name: 'Partial', value: approved, color: COLORS.approved },
    { name: 'Paid', value: paid, color: COLORS.paid },
  ].filter(item => item.value > 0) // Only show non-zero values

  const total = pending + approved + paid

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Status</CardTitle>
          <CardDescription>Distribution by payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No invoice data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Status</CardTitle>
        <CardDescription>Distribution by payment status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {payload[0].name}
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {formatCurrency(payload[0].value as number)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-600">{pending}</div>
            <div className="text-xs text-muted-foreground">Open Invoices</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{approved}</div>
            <div className="text-xs text-muted-foreground">Partial Payment</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{paid}</div>
            <div className="text-xs text-muted-foreground">Fully Paid</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
