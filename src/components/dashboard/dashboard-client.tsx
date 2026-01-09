'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Users, BarChart3, Clock, CheckCircle, Wallet } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { CommissionTrendsChart } from '@/components/dashboard/commission-trends-chart'
import { TopPerformers } from '@/components/dashboard/top-performers'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { ExportButton } from '@/components/dashboard/export-button'
import { DateRange, formatDateRange, getDateRangeFromPreset } from '@/lib/date-range'
import { CommissionExportData } from '@/lib/csv-export'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface DashboardStats {
  totalSales: number
  salesCount: number
  totalCommissions: number
  commissionsCount: number
  pendingCommissions: number
  pendingCount: number
  approvedCommissions: number
  approvedCount: number
  paidCommissions: number
  paidCount: number
  averageCommissionRate: number
  activePlansCount: number
  activeClientsCount: number
  salesPeopleCount: number
}

interface TrendData {
  month: string
  sales: number
  commissions: number
  count: number
  rate: number
}

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

export function DashboardClient() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [exportData, setExportData] = useState<CommissionExportData[]>([])
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getDateRangeFromPreset('thisMonth')
  )

  useEffect(() => {
    fetchDashboardData(dateRange)
  }, [dateRange])

  const fetchDashboardData = async (range?: DateRange) => {
    setIsLoading(true)
    try {
      // Fetch data from server actions
      const [statsRes, trendsRes, performersRes, exportRes] = await Promise.all([
        fetch('/api/dashboard/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRange: range }),
        }).then(r => r.json()),
        fetch('/api/dashboard/trends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRange: range }),
        }).then(r => r.json()),
        fetch('/api/dashboard/performers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRange: range }),
        }).then(r => r.json()),
        fetch('/api/dashboard/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRange: range }),
        }).then(r => r.json()),
      ])

      if (statsRes.success) setStats(statsRes.data)
      if (trendsRes.success) setTrends(trendsRes.data)
      if (performersRes.success) setPerformers(performersRes.data)
      if (exportRes.success) setExportData(exportRes.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your sales and commission performance
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {formatDateRange(dateRange)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker onRangeChange={handleDateRangeChange} />
          <ExportButton data={exportData} label="Export" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Sales"
          value={stats.totalSales}
          description={`${stats.salesCount} transactions`}
          icon={DollarSign}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Total Commissions"
          value={stats.totalCommissions}
          description={`${stats.commissionsCount} calculated`}
          icon={TrendingUp}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Average Rate"
          value={stats.averageCommissionRate}
          description="Commission percentage"
          icon={BarChart3}
          format="percentage"
          accent="dashboard"
        />
        <StatsCard
          title="Active Plans"
          value={stats.activePlansCount}
          description={`${stats.salesPeopleCount} salespeople`}
          icon={Users}
          format="number"
          accent="dashboard"
        />
      </div>

      {/* Commission Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Pending"
          value={stats.pendingCommissions}
          description={`${stats.pendingCount} awaiting approval`}
          icon={Clock}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Approved"
          value={stats.approvedCommissions}
          description={`${stats.approvedCount} ready to pay`}
          icon={CheckCircle}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Paid"
          value={stats.paidCommissions}
          description={`${stats.paidCount} completed`}
          icon={Wallet}
          format="currency"
          accent="dashboard"
        />
      </div>

      {/* Charts and Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CommissionTrendsChart data={trends} />
        <TopPerformers performers={performers.slice(0, 5)} accent="dashboard" />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
