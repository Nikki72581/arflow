'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { BulkActionsToolbar } from '@/components/commissions/bulk-actions-toolbar'
import { BulkPayoutDialog } from '@/components/commissions/bulk-payout-dialog'
import { exportCommissionsToCSV } from '@/app/actions/bulk-payout'
import { recalculateCommissions } from '@/app/actions/commission-calculations'
import { useToast } from '@/hooks/use-toast'

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
    transactionDate: Date
    project: {
      name: string
      client: {
        name: string
      }
    } | null
  }
  user: {
    firstName: string
    lastName: string
    email: string
  }
  commissionPlan: {
    name: string
  }
}

interface CommissionsTableWithBulkProps {
  commissions: Commission[]
  onRefresh: () => void
}

export function CommissionsTableWithBulk({
  commissions,
  onRefresh,
}: CommissionsTableWithBulkProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const { toast } = useToast()

  // Approved commissions can be selected for payment
  const approvedCommissions = commissions.filter(c => c.status === 'APPROVED')

  // PENDING and CALCULATED commissions can be selected for recalculation
  const recalculableCommissions = commissions.filter(c =>
    c.status === 'PENDING' || c.status === 'CALCULATED'
  )

  // Combine selectable IDs (approved for payment + pending/calculated for recalculation)
  const selectableIds = new Set([
    ...approvedCommissions.map(c => c.id),
    ...recalculableCommissions.map(c => c.id)
  ])

  const hasRecalculableSelected = Array.from(selectedIds).some(id =>
    recalculableCommissions.some(c => c.id === id)
  )

  // Calculate selected total
  const selectedTotal = Array.from(selectedIds).reduce((sum, id) => {
    const commission = commissions.find(c => c.id === id)
    return sum + (commission?.amount || 0)
  }, 0)

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(selectableIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  function handleClearSelection() {
    setSelectedIds(new Set())
  }

  function handleMarkAsPaid() {
    if (selectedIds.size > 0) {
      setShowPayoutDialog(true)
    }
  }

  async function handleExport() {
    if (selectedIds.size === 0) return

    const result = await exportCommissionsToCSV(Array.from(selectedIds))

    if (result.success && result.data) {
      // Create a download link
      const blob = new Blob([result.data.csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: `Exported ${result.data.recordCount} commission records`,
      })
    } else {
      toast({
        title: 'Export failed',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  async function handleExportAndPay() {
    if (selectedIds.size === 0) return

    // First export
    await handleExport()

    // Then open the payout dialog
    setShowPayoutDialog(true)
  }

  async function handleRecalculate() {
    if (selectedIds.size === 0) return

    setIsRecalculating(true)

    const result = await recalculateCommissions(Array.from(selectedIds))

    setIsRecalculating(false)

    if (result.success) {
      toast({
        title: 'Recalculation complete',
        description: result.message,
      })
      setSelectedIds(new Set())
      onRefresh()
    } else {
      toast({
        title: 'Recalculation failed',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  function handlePayoutSuccess() {
    setSelectedIds(new Set())
    onRefresh()
  }

  const allSelectableSelected = selectableIds.size > 0 &&
    Array.from(selectableIds).every(id => selectedIds.has(id))

  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="h-12 px-4 text-left align-middle font-medium">
                {selectableIds.size > 0 && (
                  <Checkbox
                    checked={allSelectableSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all commissions"
                  />
                )}
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Salesperson</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Client</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Project</th>
              <th className="h-12 px-4 text-right align-middle font-medium">Sale Amount</th>
              <th className="h-12 px-4 text-right align-middle font-medium">Commission</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission) => {
              const isSelectable = selectableIds.has(commission.id)
              const isSelected = selectedIds.has(commission.id)

              return (
                <tr
                  key={commission.id}
                  className={`border-b ${isSelected ? 'bg-muted/50' : ''}`}
                >
                  <td className="p-4">
                    {isSelectable && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectOne(commission.id, checked as boolean)
                        }
                        aria-label={`Select commission for ${commission.user.firstName} ${commission.user.lastName}`}
                      />
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {formatDate(commission.salesTransaction.transactionDate)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">
                      {commission.user.firstName} {commission.user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {commission.user.email}
                    </div>
                  </td>
                  <td className="p-4">
                    {commission.salesTransaction.project?.client?.name || 'N/A'}
                  </td>
                  <td className="p-4">
                    {commission.salesTransaction.project?.name || 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    {formatCurrency(commission.salesTransaction.amount)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatCurrency(commission.amount)}
                  </td>
                  <td className="p-4">
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
                        {formatDate(commission.paidAt)}
                      </div>
                    )}
                    {commission.status === 'APPROVED' && commission.approvedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(commission.approvedAt)}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        selectedTotal={selectedTotal}
        onMarkAsPaid={handleMarkAsPaid}
        onExport={handleExport}
        onExportAndPay={handleExportAndPay}
        onRecalculate={handleRecalculate}
        onClearSelection={handleClearSelection}
        showRecalculate={hasRecalculableSelected}
      />

      <BulkPayoutDialog
        open={showPayoutDialog}
        onOpenChange={setShowPayoutDialog}
        calculationIds={Array.from(selectedIds)}
        onSuccess={handlePayoutSuccess}
      />
    </>
  )
}
