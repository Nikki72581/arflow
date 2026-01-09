'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { StatsCard } from '@/components/dashboard/stats-card'
import { CommissionTrendsChart } from '@/components/dashboard/commission-trends-chart'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, DollarSign, Users, BarChart3, FileSpreadsheet, FileText, File } from 'lucide-react'
import { getDashboardStats, getCommissionTrends, getTopPerformers, getCommissionExportData } from '@/app/actions/dashboard'
import { DateRange } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CommissionStatusChart } from '@/components/reports/commission-status-chart'
import { SalesByCategoryChart } from '@/components/reports/sales-by-category-chart'
import { PerformanceComparisonChart } from '@/components/reports/performance-comparison-chart'
import { TopPerformersBarChart } from '@/components/reports/top-performers-bar-chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToPDF, exportToExcel } from '@/lib/export-utils'

type DashboardStats = {
  totalSales: number
  salesCount: number
  totalCommissions: number
  commissionsCount: number
  pendingCommissions: number
  approvedCommissions: number
  paidCommissions: number
  averageCommissionRate: number
  activePlansCount: number
  activeClientsCount: number
  salesPeopleCount: number
}

type CommissionTrend = {
  month: string
  sales: number
  commissions: number
  count: number
  rate: number
}

type Performer = {
  userId: string
  name: string
  email: string
  totalSales: number
  totalCommissions: number
  salesCount: number
  averageCommissionRate: number
}

export function ReportsContent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trends, setTrends] = useState<CommissionTrend[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'line' | 'area'>('area')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const [statsResult, trendsResult, performersResult] = await Promise.all([
        getDashboardStats(dateRange),
        getCommissionTrends({ months: 12, dateRange }),
        getTopPerformers(dateRange, 50),
      ])

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
      if (trendsResult.success && trendsResult.data) {
        setTrends(trendsResult.data)
      }
      if (performersResult.success && performersResult.data) {
        setPerformers(performersResult.data)
      }
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'csv' | 'pdf' | 'excel') {
    setExporting(true)
    try {
      const exportResult = await getCommissionExportData(dateRange)

      if (!exportResult.success || !exportResult.data) {
        throw new Error('Failed to fetch export data')
      }

      const data = exportResult.data

      switch (format) {
        case 'csv':
          exportToCSV(data, `commission-report-${new Date().toISOString().split('T')[0]}`)
          break
        case 'pdf':
          await exportToPDF(data, stats, performers, `commission-report-${new Date().toISOString().split('T')[0]}`)
          break
        case 'excel':
          await exportToExcel(data, stats, performers, `commission-report-${new Date().toISOString().split('T')[0]}`)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading || !stats) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and export */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">
            Performance Reports
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and performance insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangePicker onRangeChange={setDateRange} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <File className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sales"
          value={stats.totalSales}
          format="currency"
          icon={DollarSign}
          description={`${stats.salesCount} transactions`}
          accent="reports"
        />
        <StatsCard
          title="Total Commissions"
          value={stats.totalCommissions}
          format="currency"
          icon={TrendingUp}
          description={`${stats.commissionsCount} calculations`}
          accent="reports"
        />
        <StatsCard
          title="Average Rate"
          value={stats.averageCommissionRate}
          format="percentage"
          icon={BarChart3}
          description="Commission percentage"
          accent="reports"
        />
        <StatsCard
          title="Active Salespeople"
          value={stats.salesPeopleCount}
          format="number"
          icon={Users}
          description={`${stats.activeClientsCount} active clients`}
          accent="reports"
        />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission Trends */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Commission Trends</CardTitle>
                    <CardDescription>Monthly performance over time</CardDescription>
                  </div>
                  <Select value={chartType} onValueChange={(value: 'line' | 'area') => setChartType(value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="area">Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <CommissionTrendsChart data={trends} type={chartType} />
              </CardContent>
            </Card>

            {/* Commission Status Breakdown */}
            <CommissionStatusChart
              pending={stats.pendingCommissions}
              approved={stats.approvedCommissions}
              paid={stats.paidCommissions}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers Bar Chart */}
            <TopPerformersBarChart performers={performers.slice(0, 10)} />

            {/* Sales by Category */}
            <SalesByCategoryChart dateRange={dateRange} />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Performance Comparison */}
            <PerformanceComparisonChart performers={performers.slice(0, 15)} />

            {/* Top Performers Table */}
            <Card>
              <CardHeader>
                <CardTitle>Salesperson Rankings</CardTitle>
                <CardDescription>
                  Performance metrics for all salespeople
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Total Commissions</TableHead>
                      <TableHead className="text-right">Number of Sales</TableHead>
                      <TableHead className="text-right">Avg Commission %</TableHead>
                      <TableHead className="text-right">Avg Sale Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performers.map((performer, index) => {
                      const averageSaleAmount = performer.totalSales / performer.salesCount

                      return (
                        <TableRow key={performer.userId}>
                          <TableCell>
                            <Badge variant={index < 3 ? 'default' : 'outline'}>
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{performer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {performer.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(performer.totalSales)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(performer.totalCommissions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {performer.salesCount}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {performer.averageCommissionRate.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(averageSaleAmount)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Commissions</CardTitle>
                <CardDescription>Awaiting calculation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {formatCurrency(stats.pendingCommissions)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Requires processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approved Commissions</CardTitle>
                <CardDescription>Ready for payment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(stats.approvedCommissions)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Awaiting payout
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paid Commissions</CardTitle>
                <CardDescription>Successfully disbursed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.paidCommissions)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Completed payments
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesByCategoryChart dateRange={dateRange} />
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Additional performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Commission Plans</span>
                  <span className="text-2xl font-bold">{stats.activePlansCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Clients</span>
                  <span className="text-2xl font-bold">{stats.activeClientsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sales Team Size</span>
                  <span className="text-2xl font-bold">{stats.salesPeopleCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg Sale Size</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(stats.salesCount > 0 ? stats.totalSales / stats.salesCount : 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commission Details</CardTitle>
              <CardDescription>
                Detailed breakdown of commission calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Commission Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Calculations:</span>
                        <span className="font-medium">{stats.commissionsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-medium">{formatCurrency(stats.totalCommissions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Rate:</span>
                        <span className="font-medium">{stats.averageCommissionRate.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Sales Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Transactions:</span>
                        <span className="font-medium">{stats.salesCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Revenue:</span>
                        <span className="font-medium">{formatCurrency(stats.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Sale:</span>
                        <span className="font-medium">
                          {formatCurrency(stats.salesCount > 0 ? stats.totalSales / stats.salesCount : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm mb-3">Status Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(stats.pendingCommissions)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-sm">Approved</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(stats.approvedCommissions)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-sm">Paid</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(stats.paidCommissions)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
