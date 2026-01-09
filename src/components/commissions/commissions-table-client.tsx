'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { TablePagination } from '@/components/ui/table-pagination'
import { CommissionDetailDialog } from '@/components/commissions/commission-detail-dialog'
import { formatDate, formatCurrency } from '@/lib/utils'

interface CommissionsTableClientProps {
  calculations: any[]
  searchQuery?: string
}

export function CommissionsTableClient({
  calculations,
  searchQuery,
}: CommissionsTableClientProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Calculate pagination
  const totalRecords = calculations.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  // Reset to page 1 if current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage
  if (safePage !== currentPage) {
    setCurrentPage(safePage)
  }

  const paginatedCalculations = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return calculations.slice(startIndex, endIndex)
  }, [calculations, safePage, pageSize])

  // Calculate totals by status
  const totalAmount = calculations.reduce((sum, calc) => sum + calc.amount, 0)
  const pendingAmount = calculations
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, calc) => sum + calc.amount, 0)
  const approvedAmount = calculations
    .filter((c) => c.status === 'APPROVED')
    .reduce((sum, calc) => sum + calc.amount, 0)
  const paidAmount = calculations
    .filter((c) => c.status === 'PAID')
    .reduce((sum, calc) => sum + calc.amount, 0)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  if (calculations.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No commissions found"
        description="No commissions match your filters. Try adjusting your search."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border-2 hover:border-blue-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-muted/20 p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <div className="rounded-lg border-2 hover:border-amber-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-amber-500/5 p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
          <Badge variant="outline" className="mt-1">
            {calculations.filter((c) => c.status === 'PENDING').length} items
          </Badge>
        </div>
        <div className="rounded-lg border-2 hover:border-green-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 p-4">
          <div className="text-sm text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold">{formatCurrency(approvedAmount)}</div>
          <Badge variant="secondary" className="mt-1">
            {calculations.filter((c) => c.status === 'APPROVED').length} items
          </Badge>
        </div>
        <div className="rounded-lg border-2 hover:border-blue-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-blue-500/5 p-4">
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="text-2xl font-bold">{formatCurrency(paidAmount)}</div>
          <Badge variant="default" className="mt-1">
            {calculations.filter((c) => c.status === 'PAID').length} items
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>Sale Amount</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCalculations.map((calc) => (
              <TableRow key={calc.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(calc.calculatedAt)}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {calc.user.firstName} {calc.user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{calc.user.email}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(calc.salesTransaction.amount)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">
                      {formatCurrency(calc.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((calc.amount / calc.salesTransaction.amount) * 100).toFixed(1)}% of sale
                    </div>
                    <CommissionDetailDialog
                      calculation={calc}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-blue-600 dark:text-blue-400 hover:bg-accent hover:text-accent-foreground"
                        >
                          View Breakdown
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/plans/${calc.commissionPlan.id}`}
                    className="text-sm hover:underline"
                  >
                    {calc.commissionPlan.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {calc.salesTransaction.project ? (
                    <Link
                      href={`/dashboard/projects/${calc.salesTransaction.project.id}`}
                      className="text-sm hover:underline"
                    >
                      {calc.salesTransaction.project.name}
                    </Link>
                  ) : (
                    <div className="text-sm text-muted-foreground">No Project</div>
                  )}
                </TableCell>
                <TableCell>
                  {calc.salesTransaction.client?.name ? (
                    <div className="text-sm">{calc.salesTransaction.client.name}</div>
                  ) : calc.salesTransaction.project?.client?.name ? (
                    <div className="text-sm">{calc.salesTransaction.project.client.name}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No Customer</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      calc.status === 'PAID'
                        ? 'default'
                        : calc.status === 'APPROVED'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {calc.status}
                  </Badge>
                  {calc.status === 'PAID' && (calc as any).paidAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate((calc as any).paidAt)}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={safePage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}
