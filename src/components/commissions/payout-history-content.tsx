'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PayoutBatch {
  date: Date
  commissionsCount: number
  totalAmount: number
  salespeopleCount: number
  commissions: Array<{
    id: string
    amount: number
    salespersonName: string
    salespersonEmail: string
  }>
}

interface PayoutHistoryContentProps {
  payouts: PayoutBatch[]
}

export function PayoutHistoryContent({ payouts }: PayoutHistoryContentProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  // Calculate overall stats
  const totalPaid = payouts.reduce((sum, batch) => sum + batch.totalAmount, 0)
  const totalCommissions = payouts.reduce((sum, batch) => sum + batch.commissionsCount, 0)
  const totalBatches = payouts.length

  function toggleBatch(dateKey: string) {
    const newExpanded = new Set(expandedBatches)
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey)
    } else {
      newExpanded.add(dateKey)
    }
    setExpandedBatches(newExpanded)
  }

  function exportBatchToCSV(batch: PayoutBatch) {
    const headers = ['Salesperson Name', 'Email', 'Commission Amount']
    const rows = batch.commissions.map((c) => [
      c.salespersonName,
      c.salespersonEmail,
      c.amount.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payout-${formatDate(batch.date)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border-2 hover:border-green-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 p-4">
          <div className="text-sm text-muted-foreground">Total Paid</div>
          <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="rounded-lg border-2 hover:border-blue-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-blue-500/5 p-4">
          <div className="text-sm text-muted-foreground">Total Commissions</div>
          <div className="text-2xl font-bold">{totalCommissions}</div>
        </div>
        <div className="rounded-lg border-2 hover:border-purple-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-purple-500/5 p-4">
          <div className="text-sm text-muted-foreground">Payout Batches</div>
          <div className="text-2xl font-bold">{totalBatches}</div>
        </div>
      </div>

      {/* Payout Batches List */}
      <div className="space-y-3">
        {payouts.map((batch) => {
          const dateKey = batch.date.toISOString()
          const isExpanded = expandedBatches.has(dateKey)

          return (
            <div key={dateKey} className="rounded-lg border bg-card">
              {/* Batch Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleBatch(dateKey)}
                      className="hover:bg-muted rounded p-1 transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="font-semibold">{formatDate(batch.date)}</div>
                      <div className="text-sm text-muted-foreground">
                        {batch.commissionsCount} commission{batch.commissionsCount !== 1 ? 's' : ''} • {batch.salespeopleCount} salesperson{batch.salespeopleCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatCurrency(batch.totalAmount)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportBatchToCSV(batch)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-10 px-4 text-left align-middle font-medium text-sm">
                            Salesperson
                          </th>
                          <th className="h-10 px-4 text-left align-middle font-medium text-sm">
                            Email
                          </th>
                          <th className="h-10 px-4 text-right align-middle font-medium text-sm">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.commissions.map((commission) => (
                          <tr key={commission.id} className="border-b last:border-0">
                            <td className="p-4">
                              <div className="font-medium">
                                {commission.salespersonName}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-muted-foreground">
                                {commission.salespersonEmail}
                              </div>
                            </td>
                            <td className="p-4 text-right font-medium">
                              {formatCurrency(commission.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
