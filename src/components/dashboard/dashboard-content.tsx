'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Users, BarChart3, Clock, CheckCircle, Wallet, Sparkles } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { CommissionTrendsChart } from '@/components/dashboard/commission-trends-chart'
import { TopPerformers } from '@/components/dashboard/top-performers'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { ExportButton } from '@/components/dashboard/export-button'
import { DateRange, formatDateRange } from '@/lib/date-range'
import { CommissionExportData } from '@/lib/csv-export'
import { DashboardSkeleton } from './dashboard-skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
  userId: string
  name: string
  email: string
  totalSales: number
  totalCommissions: number
  salesCount: number
  averageCommissionRate: number
}

interface DashboardContentProps {
  initialStats: DashboardStats
  initialTrends: TrendData[]
  initialPerformers: Performer[]
  initialDateRange: DateRange
}

export function DashboardContent({
  initialStats,
  initialTrends,
  initialPerformers,
  initialDateRange,
}: DashboardContentProps) {
  const isFreshOrg =
    initialStats.activePlansCount === 0 &&
    initialStats.activeClientsCount === 0 &&
    initialStats.salesCount === 0 &&
    initialStats.commissionsCount === 0 &&
    initialStats.salesPeopleCount === 0
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [trends, setTrends] = useState<TrendData[]>(initialTrends)
  const [performers, setPerformers] = useState<Performer[]>(initialPerformers)
  const [exportData, setExportData] = useState<CommissionExportData[]>([])
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange)

  const handleDateRangeChange = async (range: DateRange) => {
    setDateRange(range)
    setIsLoading(true)

    try {
      // Fetch filtered data
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
      console.error('Error fetching filtered dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <DashboardSkeleton />
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

      {isFreshOrg ? (
        <Alert className="border-amber-200/70 bg-amber-50/70 text-amber-900">
          <Sparkles />
          <AlertTitle>Welcome! You’re all set to get started.</AlertTitle>
          <AlertDescription className="text-amber-800/90">
            <p>Visit the help and support page for quick guides and next steps.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/dashboard/help">Go to Help & Support</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

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
