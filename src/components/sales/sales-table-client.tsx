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
import { EmptyState } from '@/components/ui/empty-state'
import { TablePagination } from '@/components/ui/table-pagination'
import { SalesTransactionActions } from '@/components/sales/sales-transaction-actions'
import { CommissionDetailDialog } from '@/components/commissions/commission-detail-dialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { SalesTransactionWithRelations } from '@/lib/types'

interface SalesTableClientProps {
  sales: SalesTransactionWithRelations[]
  searchQuery?: string
  projects: any[]
  clients: any[]
  users: any[]
  productCategories: any[]
  requireProjects: boolean
}

export function SalesTableClient({
  sales,
  searchQuery,
  projects,
  clients,
  users,
  productCategories,
  requireProjects,
}: SalesTableClientProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Calculate pagination
  const totalRecords = sales.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  // Reset to page 1 if current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage
  if (safePage !== currentPage) {
    setCurrentPage(safePage)
  }

  const paginatedSales = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sales.slice(startIndex, endIndex)
  }, [sales, safePage, pageSize])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  if (sales.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No sales found"
        description={searchQuery ? `No sales match "${searchQuery}". Try a different search term.` : "Record your first sale to start tracking commissions."}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-blue-500/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                <TableHead className="w-[100px] font-semibold">Date</TableHead>
                <TableHead className="w-[120px] font-semibold">Amount</TableHead>
                <TableHead className="w-[80px] font-semibold">Type</TableHead>
                <TableHead className="w-[200px] font-semibold">Project / Client</TableHead>
                <TableHead className="w-[150px] font-semibold">Salesperson</TableHead>
                <TableHead className="w-[180px] font-semibold">Commission</TableHead>
                <TableHead className="min-w-[150px] font-semibold">Details</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSales.map((sale, index) => {
                const hasCommission = sale.commissionCalculations.length > 0
                const commission = hasCommission ? sale.commissionCalculations[0] : null

                // Debug: log commission data for first row
                if (index === 0 && commission) {
                  console.log('First row commission data:', {
                    hasCommission,
                    commissionId: commission.id,
                    commissionAmount: commission.amount,
                    commissionStatus: commission.status
                  })
                }

                const transactionTypeLabel = sale.transactionType === 'RETURN' ? 'Return' : sale.transactionType === 'ADJUSTMENT' ? 'Adjustment' : 'Sale'
                const transactionTypeVariant = sale.transactionType === 'RETURN' ? 'destructive' : sale.transactionType === 'ADJUSTMENT' ? 'warning' : 'success'

                // Get row background based on transaction type
                const rowBgClass = sale.transactionType === 'RETURN'
                  ? 'hover:bg-red-500/5'
                  : sale.transactionType === 'ADJUSTMENT'
                  ? 'hover:bg-amber-500/5'
                  : 'hover:bg-emerald-500/5'

                return (
                  <TableRow key={sale.id} className={`transition-colors border-b border-blue-500/5 ${rowBgClass}`}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {formatDate(sale.transactionDate)}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(sale.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transactionTypeVariant as 'success' | 'destructive' | 'warning'} className="text-xs">
                        {transactionTypeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {sale.project ? (
                          <Link
                            href={`/dashboard/projects/${sale.project.id}`}
                            className="hover:underline font-medium text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                          >
                            {sale.project.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">No project</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {sale.project?.client.name || sale.client?.name || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {sale.user.firstName} {sale.user.lastName}
                    </TableCell>
                    <TableCell>
                      {commission ? (
                        <div className="flex flex-col gap-1 relative z-10">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(commission.amount)}
                            </span>
                            <Badge
                              variant={
                                commission.status === 'PAID'
                                  ? 'success'
                                  : commission.status === 'APPROVED'
                                  ? 'info'
                                  : commission.status === 'PENDING'
                                  ? 'warning'
                                  : 'outline'
                              }
                              className="text-xs"
                            >
                              {commission.status}
                            </Badge>
                          </div>
                          <CommissionDetailDialog
                            calculation={commission}
                            salesAmount={sale.amount}
                            salesDate={sale.transactionDate}
                            salesDescription={sale.description}
                            salesInvoice={sale.invoiceNumber}
                            salespersonName={`${sale.user.firstName} ${sale.user.lastName}`}
                            trigger={
                              <button
                                className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors hover:bg-blue-500/10 h-6 px-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap relative"
                                data-testid={`view-details-${index}`}
                              >
                                View Details
                              </button>
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {sale.invoiceNumber && (
                          <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                            Invoice: {sale.invoiceNumber}
                          </span>
                        )}
                        {sale.productCategory && (
                          <Badge variant="outline" className="w-fit text-xs border-cyan-500/30 text-cyan-700 dark:text-cyan-400">
                            {sale.productCategory.name}
                          </Badge>
                        )}
                        {sale.description && (
                          <span className="text-xs text-muted-foreground truncate" title={sale.description}>
                            {sale.description}
                          </span>
                        )}
                        {!sale.invoiceNumber && !sale.productCategory && !sale.description && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <SalesTransactionActions
                          transaction={sale}
                          projects={projects}
                          clients={clients}
                          users={users}
                          productCategories={productCategories}
                          requireProjects={requireProjects}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
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
