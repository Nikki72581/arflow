'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

// Lazy load charts for better LCP
const CommissionTrendsChart = dynamic(
  () => import('./commission-trends-chart').then((mod) => ({ default: mod.CommissionTrendsChart })),
  {
    loading: () => (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
)

const TopPerformers = dynamic(
  () => import('./top-performers').then((mod) => ({ default: mod.TopPerformers })),
  {
    loading: () => (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
)

interface TrendData {
  month: string
  sales: number
  commissions: number
  count: number
  rate: number
}

interface Performer {
  userId: string
  name: string
  email: string
  totalSales: number
  totalCommissions: number
  salesCount: number
  averageCommissionRate: number
}

interface DashboardChartsProps {
  trends: TrendData[]
  performers: Performer[]
}

export function DashboardCharts({ trends, performers }: DashboardChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CommissionTrendsChart data={trends} />
      <TopPerformers performers={performers.slice(0, 5)} accent="dashboard" />
    </div>
  )
}
