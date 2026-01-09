import { Suspense } from 'react'
import { TrendingUp, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { getCommissionCalculations } from '@/app/actions/commission-calculations'
import { CommissionFilters } from '@/components/commissions/commission-filters'
import { CommissionsTableClient } from '@/components/commissions/commissions-table-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Commissions | ARFlow',
  description: 'Review and approve commission calculations',
}

async function CommissionsTable({
  searchQuery,
  statusFilter,
  userIdFilter,
}: {
  searchQuery?: string
  statusFilter?: string
  userIdFilter?: string
}) {
  const result = await getCommissionCalculations()

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  let calculations = result.data || []

  // Filter by status
  if (statusFilter && statusFilter !== 'all') {
    calculations = calculations.filter(
      (calc) => calc.status.toLowerCase() === statusFilter.toLowerCase()
    )
  }

  // Filter by userId (salesperson)
  if (userIdFilter && userIdFilter !== 'all') {
    calculations = calculations.filter(
      (calc) => calc.user.id === userIdFilter
    )
  }

  // Filter by search query
  if (searchQuery && calculations.length > 0) {
    const query = searchQuery.toLowerCase()
    calculations = calculations.filter(
      (calc) => {
        const salespersonName = `${calc.user.firstName} ${calc.user.lastName}`.toLowerCase()
        const projectName = calc.salesTransaction.project?.name?.toLowerCase() || ''
        const projectClientName = calc.salesTransaction.project?.client?.name?.toLowerCase() || ''
        const directClientName = calc.salesTransaction.client?.name?.toLowerCase() || ''
        const planName = calc.commissionPlan.name.toLowerCase()

        return (
          salespersonName.includes(query) ||
          projectName.includes(query) ||
          projectClientName.includes(query) ||
          directClientName.includes(query) ||
          planName.includes(query)
        )
      }
    )
  }

  if (calculations.length === 0) {
    if (searchQuery || statusFilter !== 'all') {
      return (
        <EmptyState
          icon={Search}
          title="No commissions found"
          description="No commissions match your filters. Try adjusting your search."
        />
      )
    }

    return (
      <EmptyState
        icon={TrendingUp}
        title="No commissions yet"
        description="Commission calculations will appear here once you record sales."
      />
    )
  }

  return <CommissionsTableClient calculations={calculations} searchQuery={searchQuery} />
}

function CommissionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading commissions...
        </div>
      </div>
    </div>
  )
}

export default async function CommissionsPage(props: {
  searchParams: Promise<{ search?: string; status?: string; userId?: string }>
}) {
  const searchParams = await props.searchParams
  const statusFilter = searchParams.status || 'all'
  const userIdFilter = searchParams.userId || 'all'

  // Fetch users for the salesperson filter
  const { prisma } = await import('@/lib/db')
  const { getCurrentUserWithOrg } = await import('@/lib/auth')
  const currentUser = await getCurrentUserWithOrg()

  const usersRaw = await prisma.user.findMany({
    where: {
      organizationId: currentUser.organizationId,
      isPlaceholder: false,
      firstName: { not: null },
      lastName: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' },
    ],
  })

  const users = usersRaw.map((u) => ({
    id: u.id,
    firstName: u.firstName!,
    lastName: u.lastName!,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Commissions</h1>
          <p className="text-muted-foreground">
            Review and approve commission calculations
          </p>
        </div>
      </div>

      <CommissionFilters users={users} />

      <Suspense fallback={<CommissionsTableSkeleton />}>
        <CommissionsTable
          searchQuery={searchParams.search}
          statusFilter={statusFilter}
          userIdFilter={userIdFilter}
        />
      </Suspense>
    </div>
  )
}
