'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  approveCalculation,
  rejectCalculation,
  markCalculationPaid,
} from '@/app/actions/commission-calculations'

interface CommissionActionsProps {
  calculationId: string
  status: 'PENDING' | 'CALCULATED' | 'APPROVED' | 'PAID'
  amount: number
}

export function CommissionActions({ calculationId, status, amount }: CommissionActionsProps) {
  const router = useRouter()
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showPaidDialog, setShowPaidDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    const result = await approveCalculation(calculationId)
    
    if (result.success) {
      setShowApproveDialog(false)
      router.refresh()
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    const result = await rejectCalculation(calculationId)
    
    if (result.success) {
      setShowRejectDialog(false)
      router.refresh()
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  async function handleMarkPaid() {
    setLoading(true)
    const result = await markCalculationPaid(calculationId)
    
    if (result.success) {
      setShowPaidDialog(false)
      router.refresh()
    } else {
      alert(result.error)
      setLoading(false)
    }
  }

  // Don't show actions if already paid
  if (status === 'PAID') {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Approve button - for PENDING and CALCULATED */}
        {(status === 'PENDING' || status === 'CALCULATED') && (
          <Button
            onClick={() => setShowApproveDialog(true)}
            size="sm"
            variant="default"
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        )}

        {/* Mark as Paid button - only for APPROVED */}
        {status === 'APPROVED' && (
          <Button
            onClick={() => setShowPaidDialog(true)}
            size="sm"
            variant="default"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Mark as Paid
          </Button>
        )}

        {/* Reject button - for PENDING, CALCULATED and APPROVED */}
        {(status === 'PENDING' || status === 'CALCULATED' || status === 'APPROVED') && (
          <Button
            onClick={() => setShowRejectDialog(true)}
            size="sm"
            variant="destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        )}
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Commission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve a commission of <strong>${amount.toFixed(2)}</strong> and move
              it to the approved status. You can mark it as paid later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={loading}>
              {loading ? 'Approving...' : 'Approve Commission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Commission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently reject and delete this commission calculation of{' '}
              <strong>${amount.toFixed(2)}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Rejecting...' : 'Reject Commission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Dialog */}
      <AlertDialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the commission of <strong>${amount.toFixed(2)}</strong> as paid.
              Make sure the payment has been processed before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid} disabled={loading}>
              {loading ? 'Marking as Paid...' : 'Confirm Payment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
