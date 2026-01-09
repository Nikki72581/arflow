import { Suspense } from 'react'
import { PageHeader } from '@/components/navigation/breadcrumbs'
import { PendingApprovalsContent } from '@/components/commissions/pending-approvals-content'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pending Approvals | ARFlow',
  description: 'Approve pending commission calculations',
}

async function PendingApprovalsTable() {
  const currentUser = await requireAdmin()

  const pendingCalculations = await prisma.commissionCalculation.findMany({
    where: {
      organizationId: currentUser.organizationId,
      status: { in: ['PENDING', 'CALCULATED'] },
    },
    include: {
      salesTransaction: {
        include: {
          project: {
            include: {
              client: true,
            },
          },
        },
      },
      user: true,
      commissionPlan: true,
    },
    orderBy: {
      calculatedAt: 'desc',
    },
  })

  return <PendingApprovalsContent commissions={pendingCalculations as any} />
}

function PendingApprovalsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading pending approvals...
        </div>
      </div>
    </div>
  )
}

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Approvals"
        description="Review and approve pending commission calculations"
        titleClassName="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent"
        breadcrumbs={[
          { title: 'Commissions', href: '/dashboard/commissions' },
          { title: 'Pending Approvals' },
        ]}
      />

      <Suspense fallback={<PendingApprovalsSkeleton />}>
        <PendingApprovalsTable />
      </Suspense>
    </div>
  )
}
