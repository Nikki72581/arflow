'use client'

import { CommissionsTableWithBulk } from '@/components/commissions/commissions-table-with-bulk'
import { formatCurrency } from '@/lib/utils'

interface BulkPayoutsContentProps {
  commissions: any[]
}

export function BulkPayoutsContent({ commissions }: BulkPayoutsContentProps) {
  const handleRefresh = () => {
    window.location.reload()
  }

  // Calculate total for approved commissions
  const totalApproved = commissions.reduce((sum, calc) => sum + calc.amount, 0)
  const uniqueSalespeople = new Set(commissions.map(c => c.userId)).size

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border-2 hover:border-green-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-green-500/5 p-4">
          <div className="text-sm text-muted-foreground">Total Amount</div>
          <div className="text-2xl font-bold">{formatCurrency(totalApproved)}</div>
        </div>
        <div className="rounded-lg border-2 hover:border-blue-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-blue-500/5 p-4">
          <div className="text-sm text-muted-foreground">Commissions</div>
          <div className="text-2xl font-bold">{commissions.length}</div>
        </div>
        <div className="rounded-lg border-2 hover:border-purple-500/50 transition-all hover:shadow-lg bg-gradient-to-br from-card to-purple-500/5 p-4">
          <div className="text-sm text-muted-foreground">Salespeople</div>
          <div className="text-2xl font-bold">{uniqueSalespeople}</div>
        </div>
      </div>

      {/* Table with Bulk Actions */}
      <CommissionsTableWithBulk commissions={commissions} onRefresh={handleRefresh} />
    </div>
  )
}
