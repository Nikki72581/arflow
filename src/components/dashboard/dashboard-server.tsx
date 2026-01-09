import { Suspense } from 'react'
import { getDashboardStats, getCommissionTrends, getTopPerformers } from '@/app/actions/dashboard'
import { getDateRangeFromPreset } from '@/lib/date-range'
import { DashboardStats } from './dashboard-stats'
import { DashboardCharts } from './dashboard-charts'
import { StatsSkeleton, ChartsSkeleton } from './dashboard-skeleton'
import { DashboardHeader } from './dashboard-header'

async function DashboardStatsSection() {
  const defaultDateRange = getDateRangeFromPreset('thisMonth')
  const statsResult = await getDashboardStats(defaultDateRange)

  if (!statsResult.success || !statsResult.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load dashboard statistics</p>
      </div>
    )
  }

  return <DashboardStats stats={statsResult.data} />
}

async function DashboardChartsSection() {
  const defaultDateRange = getDateRangeFromPreset('thisMonth')

  const [trendsResult, performersResult] = await Promise.all([
    getCommissionTrends({ dateRange: defaultDateRange }),
    getTopPerformers(defaultDateRange, 10),
  ])

  const trends = (trendsResult.success ? trendsResult.data : []) || []
  const performers = (performersResult.success ? performersResult.data : []) || []

  return <DashboardCharts trends={trends} performers={performers} />
}

export function DashboardServer() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* Load stats first - critical for FCP */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStatsSection />
      </Suspense>

      {/* Load charts separately - improves LCP */}
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardChartsSection />
      </Suspense>
    </div>
  )
}
