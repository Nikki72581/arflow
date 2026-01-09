'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, X, Download, CheckCircle, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BulkActionsToolbarProps {
  selectedCount: number
  selectedTotal: number
  onMarkAsPaid: () => void
  onExport: () => void
  onExportAndPay: () => void
  onRecalculate?: () => void
  onClearSelection: () => void
  showRecalculate?: boolean
}

export function BulkActionsToolbar({
  selectedCount,
  selectedTotal,
  onMarkAsPaid,
  onExport,
  onExportAndPay,
  onRecalculate,
  onClearSelection,
  showRecalculate = false,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
            {selectedCount} selected
          </Badge>
          <div className="flex items-center gap-1 text-sm font-medium">
            <DollarSign className="h-4 w-4" />
            {formatCurrency(selectedTotal)}
          </div>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        {showRecalculate && onRecalculate && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRecalculate}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recalculate
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          onClick={onExport}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onMarkAsPaid}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Mark as Paid
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onExportAndPay}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-1" />
          Export & Pay
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
