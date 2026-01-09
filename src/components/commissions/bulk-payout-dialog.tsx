'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AlertCircle, CheckCircle, DollarSign, Users, Calendar } from 'lucide-react'
import { getPayoutSummary, bulkMarkAsPaid } from '@/app/actions/bulk-payout'
import { useToast } from '@/hooks/use-toast'

interface BulkPayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calculationIds: string[]
  onSuccess: () => void
}

interface PayoutSummary {
  totalCommissions: number
  totalAmount: number
  salespeopleCount: number
  salespeople: Array<{
    userId: string
    name: string
    email: string
    commissionsCount: number
    totalAmount: number
  }>
  earliestSaleDate: Date | null
  latestSaleDate: Date | null
}

export function BulkPayoutDialog({
  open,
  onOpenChange,
  calculationIds,
  onSuccess,
}: BulkPayoutDialogProps) {
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && calculationIds.length > 0) {
      loadSummary()
    }
  }, [open, calculationIds])

  async function loadSummary() {
    setLoading(true)
    const result = await getPayoutSummary(calculationIds)
    
    if (result.success) {
      setSummary(result.data as PayoutSummary)
    } else {
      toast({
        title: 'Error loading summary',
        description: result.error,
        variant: 'destructive',
      })
      onOpenChange(false)
    }
    setLoading(false)
  }

  async function handleConfirm() {
    setProcessing(true)
    
    const result = await bulkMarkAsPaid({
      calculationIds,
      paidDate: new Date(),
    })

    if (result.success) {
      toast({
        title: 'Payout processed successfully',
        description: `${result.data?.processedCount} commissions marked as paid for a total of ${formatCurrency(result.data?.totalAmount || 0)}`,
      })
      onSuccess()
      onOpenChange(false)
    } else {
      toast({
        title: 'Payout failed',
        description: result.error,
        variant: 'destructive',
      })
    }
    
    setProcessing(false)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading payout details...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            Please wait...
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirm Bulk Payout
          </DialogTitle>
          <DialogDescription>
            Review the payout details before confirming. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Total Amount
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalAmount)}
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Salespeople
              </div>
              <div className="text-2xl font-bold">
                {summary.salespeopleCount}
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                Commissions
              </div>
              <div className="text-2xl font-bold">
                {summary.totalCommissions}
              </div>
            </div>
          </div>

          {/* Period */}
          {summary.earliestSaleDate && summary.latestSaleDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Period:</span>
              <Badge variant="outline">
                {formatDate(summary.earliestSaleDate)} - {formatDate(summary.latestSaleDate)}
              </Badge>
            </div>
          )}

          <Separator />

          {/* Breakdown by Salesperson */}
          <div>
            <h4 className="font-semibold mb-3">Breakdown by Salesperson</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {summary.salespeople.map((person) => (
                <div
                  key={person.userId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <div className="font-medium">{person.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {person.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(person.totalAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {person.commissionsCount} commission{person.commissionsCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-amber-900 mb-1">
                This action cannot be undone
              </div>
              <div className="text-amber-700">
                {summary.totalCommissions} commission{summary.totalCommissions !== 1 ? 's' : ''} will be marked as PAID 
                and {summary.salespeopleCount} salesperson{summary.salespeopleCount !== 1 ? ' will' : ' will'} be notified.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? 'Processing...' : `Confirm Payout of ${formatCurrency(summary.totalAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
