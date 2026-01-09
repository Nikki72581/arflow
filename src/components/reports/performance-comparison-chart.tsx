'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Performer {
  id: string
  name: string
  email: string
  totalSales: number
  totalCommissions: number
  commissionsCount: number
  conversionRate: number
  outstandingBalance: number
}

interface PerformanceComparisonChartProps {
  performers: Performer[]
}

export function PerformanceComparisonChart({ performers }: PerformanceComparisonChartProps) {
  const data = performers.map(p => ({
    name: p.name.split(' ')[0], // First name only for space
    sales: p.totalSales,
    commissions: p.totalCommissions,
    count: p.commissionsCount,
  }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>Invoices vs Payments by customer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            No performance data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Comparison</CardTitle>
        <CardDescription>Invoices vs Payments by customer</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-sm">
                      <div className="grid gap-2">
                        <div className="font-bold">{payload[0].payload.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Invoices
                            </span>
                            <span className="font-bold text-blue-600">
                              {formatCurrency(payload[0].payload.sales)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Payments
                            </span>
                            <span className="font-bold text-emerald-600">
                              {formatCurrency(payload[0].payload.commissions)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Invoices
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {payload[0].payload.count}
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
            <Bar dataKey="sales" fill="#3b82f6" name="Invoices" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commissions" fill="#22c55e" name="Payments" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
