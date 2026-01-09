// src/app/dashboard/commissions/payouts/page.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/navigation/breadcrumbs'
import { getCommissionCalculations } from '@/app/actions/commission-calculations'
import { BulkPayoutsContent } from '@/components/commissions/bulk-payouts-content'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { DollarSign, History } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bulk Payouts | ARFlow',
  description: 'Process multiple commission payments at once',
}

async function BulkPayoutsTable() {
  const result = await getCommissionCalculations()

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  // Filter for only APPROVED commissions
  const approvedCommissions = (result.data || []).filter(
    (calc) => calc.status === 'APPROVED'
  )

  if (approvedCommissions.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No approved commissions"
        description="Approved commissions ready for payout will appear here. Approve commissions from the main commissions page first."
      />
    )
  }

  return <BulkPayoutsContent commissions={approvedCommissions} />
}

function BulkPayoutsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading approved commissions...
        </div>
      </div>
    </div>
  )
}

export default function BulkPayoutsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Bulk Payouts"
          description="Process multiple commission payments at once"
          titleClassName="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent"
          breadcrumbs={[
            { title: 'Commissions', href: '/dashboard/commissions' },
            { title: 'Bulk Payouts' }
          ]}
        />
        <Link href="/dashboard/commissions/payout-history">
          <Button variant="outline">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </Link>
      </div>

      <Suspense fallback={<BulkPayoutsTableSkeleton />}>
        <BulkPayoutsTable />
      </Suspense>
    </div>
  )
}
