import { Suspense } from 'react'
import Link from 'next/link'
import { FileText, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { getCommissionPlans } from '@/app/actions/commission-plans'
import { getProjects } from '@/app/actions/projects'
import { CommissionPlanFormDialog } from '@/components/plans/plan-form-dialog'
import { PlanActions } from '@/components/plans/plan-actions'
import { formatDate } from '@/lib/utils'
import { getRuleTypeLabel } from '@/lib/commission-calculator'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Commission Plans | ARFlow',
  description: 'Manage your commission plans',
}

async function PlansTable({ searchQuery }: { searchQuery?: string }) {
  const plansResult = await getCommissionPlans()

  if (!plansResult.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {plansResult.error}
      </div>
    )
  }

  let plans = plansResult.data || []

  // Filter by search query
  if (searchQuery && plans.length > 0) {
    const query = searchQuery.toLowerCase()
    plans = plans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(query) ||
        plan.description?.toLowerCase().includes(query) ||
        plan.project?.name.toLowerCase().includes(query)
    )
  }

  if (plans.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={Search}
          title="No plans found"
          description={`No plans match "${searchQuery}". Try a different search term.`}
          data-testid="empty-state"
        />
      )
    }

    return (
      <EmptyState
        icon={FileText}
        title="No commission plans yet"
        description="Create your first commission plan to define how commissions are calculated."
        data-testid="empty-state"
      />
    )
  }

  // Helper function to get badge variant for rule type
  const getRuleBadgeVariant = (ruleType: string) => {
    switch (ruleType) {
      case 'FLAT_RATE':
        return 'info'
      case 'PERCENTAGE':
        return 'success'
      case 'TIERED':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-card to-muted/20 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/50">
            <TableHead className="font-semibold">Plan Name</TableHead>
            <TableHead className="font-semibold">Project</TableHead>
            <TableHead className="font-semibold">Rules</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Calculations</TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow
              key={plan.id}
              className={`transition-colors border-b border-border/60 ${
                plan.isActive ? 'hover:bg-muted/40' : 'hover:bg-muted/30 opacity-70'
              }`}
              data-testid="plan-row"
            >
              <TableCell>
                <Link
                  href={`/dashboard/plans/${plan.id}`}
                  className={`font-medium hover:underline transition-colors ${
                    plan.isActive
                      ? 'text-foreground hover:text-foreground'
                      : 'text-muted-foreground'
                  }`}
                  data-testid="plan-name"
                >
                  {plan.name}
                </Link>
                {plan.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-xs mt-0.5">
                    {plan.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {plan.project ? (
                  <Link
                    href={`/dashboard/projects/${plan.project.id}`}
                    className="text-sm text-primary hover:underline transition-colors"
                  >
                    {plan.project.name}
                  </Link>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    General
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {plan.rules.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {plan.rules.slice(0, 2).map((rule) => (
                      <Badge
                        key={rule.id}
                        variant={getRuleBadgeVariant(rule.ruleType) as 'info' | 'success' | 'warning' | 'secondary'}
                        className="w-fit text-xs"
                      >
                        {getRuleTypeLabel(rule.ruleType)}
                      </Badge>
                    ))}
                    {plan.rules.length > 2 && (
                      <span className="text-xs font-medium text-primary">
                        +{plan.rules.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No rules</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={plan.isActive ? 'success' : 'outline'} className="font-medium">
                  {plan.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                {plan._count.commissionCalculations > 0 ? (
                  <Badge variant="info" className="font-semibold">
                    {plan._count.commissionCalculations}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(plan.createdAt)}
              </TableCell>
              <TableCell>
                <PlanActions plan={plan} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PlansTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-8 text-center text-muted-foreground">
        Loading commission plans...
      </div>
    </div>
  )
}

export default async function PlansPage(props: {
  searchParams: Promise<{ search?: string; create?: string }>
}) {
  const searchParams = await props.searchParams
  const projectsResult = await getProjects()
  const projects = projectsResult.success ? projectsResult.data : []
  const openCreateDialog = searchParams.create === '1' || searchParams.create === 'true'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Commission Plans</h1>
          <p className="text-muted-foreground">
            Define how commissions are calculated
          </p>
        </div>
        <CommissionPlanFormDialog projects={projects} defaultOpen={openCreateDialog} />
      </div>

      <div className="flex items-center gap-4">
        <form className="flex-1" action="/dashboard/plans" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search plans..."
              defaultValue={searchParams.search}
              className="pl-9 border-emerald-500/20 focus:border-emerald-500/40 focus:ring-emerald-500/20"
            />
          </div>
        </form>
      </div>

      <Suspense fallback={<PlansTableSkeleton />}>
        <PlansTable searchQuery={searchParams.search} />
      </Suspense>
    </div>
  )
}
