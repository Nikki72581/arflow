// src/app/dashboard/commissions/payout-history/page.tsx
import { Suspense } from 'react'
import { PageHeader } from '@/components/navigation/breadcrumbs'
import { getPayoutHistory } from '@/app/actions/bulk-payout'
import { PayoutHistoryContent } from '@/components/commissions/payout-history-content'
import { EmptyState } from '@/components/ui/empty-state'
import { Receipt } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payout History | ARFlow',
  description: 'View all commission payout records',
}

async function PayoutHistoryTable() {
  const result = await getPayoutHistory()

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  if (!result.data || result.data.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No payout history"
        description="Your commission payout history will appear here once you process payments."
      />
    )
  }

  return <PayoutHistoryContent payouts={result.data} />
}

function PayoutHistoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading payout history...
        </div>
      </div>
    </div>
  )
}

export default function PayoutHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payout History"
        description="View all processed commission payments"
        titleClassName="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent"
        breadcrumbs={[
          { title: 'Commissions', href: '/dashboard/commissions' },
          { title: 'Payout History' }
        ]}
      />

      <Suspense fallback={<PayoutHistoryTableSkeleton />}>
        <PayoutHistoryTable />
      </Suspense>
    </div>
  )
}
