'use client'

import { useMemo, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatsCard } from '@/components/dashboard/stats-card'
import { CommissionDetailDialog } from '@/components/commissions/commission-detail-dialog'
import { PendingApprovalsToolbar } from '@/components/commissions/pending-approvals-toolbar'
import {
  approveCalculation,
  bulkApproveCalculations,
  bulkRejectCalculations,
} from '@/app/actions/commission-calculations'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PendingCommission {
  id: string
  amount: number
  status: 'PENDING' | 'CALCULATED'
  calculatedAt: Date
  metadata?: any
  salesTransaction: {
    amount: number
    transactionDate: Date
    project: {
      id: string
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
    commissionBasis?: string | null
  }
}

interface PendingApprovalsContentProps {
  commissions: PendingCommission[]
}

export function PendingApprovalsContent({ commissions }: PendingApprovalsContentProps) {
  const [items, setItems] = useState<PendingCommission[]>(commissions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [approvedCount, setApprovedCount] = useState(0)
  const [approvedAmount, setApprovedAmount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectingIds, setRejectingIds] = useState<string[] | null>(null)
  const { toast } = useToast()

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.amount, 0),
    [selectedItems]
  )

  const pendingAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items]
  )

  function updateSelectionAfterRemove(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  function applyApprovalStats(approvedItems: PendingCommission[]) {
    const approvedTotal = approvedItems.reduce((sum, item) => sum + item.amount, 0)
    setApprovedCount((prev) => prev + approvedItems.length)
    setApprovedAmount((prev) => prev + approvedTotal)
  }

  async function handleApproveSelected() {
    if (selectedIds.size === 0) return

    const ids = Array.from(selectedIds)
    const approvingItems = items.filter((item) => selectedIds.has(item.id))

    setIsProcessing(true)
    const result = await bulkApproveCalculations({ calculationIds: ids })
    setIsProcessing(false)

    if (result.success) {
      setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)))
      applyApprovalStats(approvingItems)
      setSelectedIds(new Set())
      toast({
        title: 'Commissions approved',
        description: result.message,
      })
    } else {
      toast({
        title: 'Approval failed',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  async function handleApproveOne(item: PendingCommission) {
    setIsProcessing(true)
    const result = await approveCalculation(item.id)
    setIsProcessing(false)

    if (result.success) {
      setItems((prev) => prev.filter((existing) => existing.id !== item.id))
      applyApprovalStats([item])
      updateSelectionAfterRemove([item.id])
      toast({
        title: 'Commission approved',
        description: `${item.user.firstName} ${item.user.lastName} approved.`,
      })
    } else {
      toast({
        title: 'Approval failed',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  function handleRejectSelected() {
    if (selectedIds.size === 0) return
    setRejectingIds(Array.from(selectedIds))
  }

  function handleRejectOne(item: PendingCommission) {
    setRejectingIds([item.id])
  }

  async function confirmReject() {
    if (!rejectingIds || rejectingIds.length === 0) return

    const ids = rejectingIds

    setIsProcessing(true)
    const result = await bulkRejectCalculations({ calculationIds: ids })
    setIsProcessing(false)

    if (result.success) {
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)))
      updateSelectionAfterRemove(ids)
      toast({
        title: 'Commissions rejected',
        description: result.message,
      })
    } else {
      toast({
        title: 'Rejection failed',
        description: result.error,
        variant: 'destructive',
      })
    }

    setRejectingIds(null)
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => item.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    const next = new Set(selectedIds)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    setSelectedIds(next)
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Pending value"
            value={pendingAmount}
            format="currency"
            description={`${items.length} approvals waiting`}
            accent="commissions"
          />
          <StatsCard
            title="Pending approvals"
            value={items.length}
            format="number"
            description={`${formatCurrency(pendingAmount)} remaining`}
            accent="commissions"
          />
          <StatsCard
            title="Approved by you"
            value={approvedCount}
            format="number"
            description={`${approvedCount} approved this session`}
            accent="commissions"
          />
          <StatsCard
            title="Approved value"
            value={approvedAmount}
            format="currency"
            description="Approved this session"
            accent="commissions"
          />
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            description="No pending approvals right now. New commission calculations will appear here when they're ready."
          />
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle font-medium">
                    {items.length > 0 && (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all pending approvals"
                        disabled={isProcessing}
                      />
                    )}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Calculated</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Salesperson</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Client</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Project</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Sale Amount</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Commission</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Plan</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id)
                  const projectName = item.salesTransaction.project?.name || 'No project'
                  const clientName = item.salesTransaction.project?.client?.name || 'N/A'
                  const saleAmount = item.salesTransaction.amount
                  const percentOfSale = saleAmount
                    ? ((item.amount / saleAmount) * 100).toFixed(1)
                    : '0.0'

                  return (
                    <tr key={item.id} className={`border-b ${isSelected ? 'bg-muted/50' : ''}`}>
                      <td className="p-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                          aria-label={`Select ${item.user.firstName} ${item.user.lastName}`}
                          disabled={isProcessing}
                        />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(item.calculatedAt)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">
                          {item.user.firstName} {item.user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.user.email}
                        </div>
                      </td>
                      <td className="p-4">{clientName}</td>
                      <td className="p-4">{projectName}</td>
                      <td className="p-4 text-right">
                        {formatCurrency(saleAmount)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="font-semibold text-lg">
                            {formatCurrency(item.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {percentOfSale}% of sale
                          </div>
                          <CommissionDetailDialog
                            calculation={item}
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
                      </td>
                      <td className="p-4">{item.commissionPlan.name}</td>
                      <td className="p-4">
                        <Badge variant="outline">{item.status}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveOne(item)}
                            disabled={isProcessing}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectOne(item)}
                            disabled={isProcessing}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PendingApprovalsToolbar
        selectedCount={selectedIds.size}
        selectedTotal={selectedTotal}
        onApprove={handleApproveSelected}
        onReject={handleRejectSelected}
        onClearSelection={() => setSelectedIds(new Set())}
        isProcessing={isProcessing}
      />

      <AlertDialog
        open={!!rejectingIds}
        onOpenChange={(open) => {
          if (!open) setRejectingIds(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject selected commissions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected commission calculations. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Rejecting...' : 'Reject Commissions'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
