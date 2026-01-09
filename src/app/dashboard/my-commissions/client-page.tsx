'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { ExportButton } from '@/components/dashboard/export-button'
import { StatsCard } from '@/components/dashboard/stats-card'
import { getMyCommissions, getMyCommissionStats, getMyCommissionExportData } from '@/app/actions/my-commissions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, TrendingUp, Clock, CheckCircle, Wallet } from 'lucide-react'
import type { DateRange } from '@/lib/date-range'

interface CommissionStats {
  totalEarned: number
  pending: number
  approved: number
  paid: number
  totalSales: number
  salesCount: number
  commissionsCount: number
  averageCommissionRate: number
  pendingCount: number
  approvedCount: number
  paidCount: number
}

interface Commission {
  id: string
  amount: number
  status: string
  calculatedAt?: Date
  approvedAt?: Date | null
  paidAt?: Date | null
  salesTransaction: {
    id: string
    amount: number
    trandate?: Date
    saleDate?: Date
    project: {
      name: string
      client: {
        name: string
      }
    }
  }
  commissionPlan: {
    name: string
  }
}

export default function MyCommissionsPage() {
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [exportData, setExportData] = useState<any[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  async function fetchData() {
    setLoading(true)

    const [statsResult, commissionsResult, exportResult] = await Promise.all([
      getMyCommissionStats(dateRange),
      getMyCommissions(dateRange),
      getMyCommissionExportData(dateRange),
    ])

    if (statsResult.success) {
      setStats(statsResult.data as CommissionStats)
    }
    if (commissionsResult.success) {
      setCommissions((commissionsResult.data ?? []) as Commission[])
    }

    if (exportResult.success) {
      setExportData(exportResult.data || [])
    }

    setLoading(false)
  }

  function handleDateRangeChange(range: DateRange | undefined) {
    setDateRange(range)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
            My Commissions
          </h1>
          <p className="text-muted-foreground">
            Track your sales performance and commission earnings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker 
            onRangeChange={handleDateRangeChange}
            defaultPreset="thisMonth"
          />
          <ExportButton 
            data={exportData}
            filename="my-commissions"
            label="Export My Data"
          />
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Earned"
            value={stats.totalEarned}
            description={`${stats.commissionsCount} commissions`}
            icon={DollarSign}
            format="currency"
            accent="my"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            description={`${stats.pendingCount} awaiting approval`}
            icon={Clock}
            format="currency"
            accent="my"
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            description={`${stats.approvedCount} ready for payout`}
            icon={CheckCircle}
            format="currency"
            accent="my"
          />
          <StatsCard
            title="Paid"
            value={stats.paid}
            description={`${stats.paidCount} commissions paid`}
            icon={Wallet}
            format="currency"
            accent="my"
          />
          <StatsCard
            title="Avg Commission"
            value={stats.averageCommissionRate}
            description={`${formatCurrency(stats.totalSales)} in sales`}
            icon={TrendingUp}
            format="percentage"
            accent="my"
          />
        </div>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>
            All your commission calculations and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No commissions yet</h3>
              <p className="text-muted-foreground mt-2">
                Your commissions will appear here once sales are recorded
              </p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Sale Amount</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {commission.salesTransaction.saleDate
                          ? formatDate(commission.salesTransaction.saleDate)
                          : commission.salesTransaction.trandate
                          ? formatDate(commission.salesTransaction.trandate)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {commission.salesTransaction.project.client.name}
                      </TableCell>
                      <TableCell>
                        {commission.salesTransaction.project.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {commission.commissionPlan.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(commission.salesTransaction.amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(commission.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {((commission.amount / commission.salesTransaction.amount) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            commission.status === 'PAID'
                              ? 'default'
                              : commission.status === 'APPROVED'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {commission.status}
                        </Badge>
                        {commission.status === 'PAID' && commission.paidAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Paid: {formatDate(commission.paidAt)}
                          </div>
                        )}
                        {commission.status === 'APPROVED' && commission.approvedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Approved: {formatDate(commission.approvedAt)}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
