'use client'

import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface PendingApprovalsToolbarProps {
  selectedCount: number
  selectedTotal: number
  onApprove: () => void
  onReject: () => void
  onClearSelection: () => void
  isProcessing?: boolean
}

export function PendingApprovalsToolbar({
  selectedCount,
  selectedTotal,
  onApprove,
  onReject,
  onClearSelection,
  isProcessing = false,
}: PendingApprovalsToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
            {selectedCount} selected
          </Badge>
          <div className="flex items-center gap-1 text-sm font-medium">
            {formatCurrency(selectedTotal)}
          </div>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <Button
          size="sm"
          variant="secondary"
          onClick={onApprove}
          disabled={isProcessing}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onReject}
          disabled={isProcessing}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={isProcessing}
          className="hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
