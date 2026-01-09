import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { getCommissionPlan } from '@/app/actions/commission-plans'
import { getProjects } from '@/app/actions/projects'
import { RuleFormDialog } from '@/components/plans/rule-form-dialog'
import { RuleActions } from '@/components/plans/rule-actions'
import { CommissionPreview } from '@/components/plans/commission-preview'
import { formatDate, formatCurrency } from '@/lib/utils'
import { formatRule, getRuleTypeLabel } from '@/lib/commission-calculator'
export const dynamic = 'force-dynamic'
async function PlanDetails({ planId }: { planId: string }) {
  const [planResult, projectsResult] = await Promise.all([
    getCommissionPlan(planId),
    getProjects(),
  ])

  if (!planResult.success || !planResult.data) {
    notFound()
  }

  const plan = planResult.data
  const projects = (projectsResult.success ? projectsResult.data : []) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/plans">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  {plan.name}
                </h1>
                <Badge variant={plan.isActive ? 'default' : 'outline'}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created {formatDate(plan.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning if no rules */}
      {plan.rules.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No commission rules defined
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This plan won't calculate any commissions until you add at least one rule.
                Add a rule below to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Plan Information */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.description && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
            )}

            {plan.project && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Attached Project</p>
                <Link
                  href={`/dashboard/projects/${plan.project.id}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {plan.project.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Client: {plan.project.client.name}
                </p>
              </div>
            )}

            {!plan.project && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Scope</p>
                <p className="text-sm text-muted-foreground">General (not project-specific)</p>
              </div>
            )}

            <Separator className="bg-emerald-500/20" />

            <div className="space-y-1">
              <p className="text-sm font-medium">Statistics</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Rules</p>
                  <p className="font-medium">{plan.rules.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Calculations</p>
                  <p className="font-medium">{plan.commissionCalculations.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules & Preview */}
        <div className="md:col-span-2 space-y-6">
          {/* Commission Rules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Commission Rules</CardTitle>
              <RuleFormDialog planId={plan.id} />
            </CardHeader>
            <CardContent>
              {plan.rules.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No rules yet"
                  description="Add a rule to define how commissions are calculated for this plan."
                />
              ) : (
                <div className="space-y-3">
                  {plan.rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="flex items-start justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getRuleTypeLabel(rule.ruleType)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Rule {index + 1}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          {formatRule(rule)}
                        </div>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground">
                            {rule.description}
                          </p>
                        )}
                        {(rule.minAmount || rule.maxAmount) && (
                          <div className="text-xs text-muted-foreground">
                            {rule.minAmount && `Min: ${formatCurrency(rule.minAmount)}`}
                            {rule.minAmount && rule.maxAmount && ' • '}
                            {rule.maxAmount && `Max: ${formatCurrency(rule.maxAmount)}`}
                          </div>
                        )}
                      </div>
                      <RuleActions rule={rule} planId={plan.id} projects={projects} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission Preview */}
          <CommissionPreview rules={plan.rules} />
        </div>
      </div>

      {/* Recent Calculations */}
      {plan.commissionCalculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Calculations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.commissionCalculations.map((calc) => (
                <div
                  key={calc.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {calc.user.firstName} {calc.user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sale: {formatCurrency(calc.salesTransaction.amount)} •{' '}
                      {formatDate(calc.calculatedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(calc.amount)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {calc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PlanDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-muted animate-pulse rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-96 bg-muted animate-pulse rounded" />
        <div className="md:col-span-2 space-y-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}

export default async function PlanPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  return (
    <Suspense fallback={<PlanDetailsSkeleton />}>
      <PlanDetails planId={params.id} />
    </Suspense>
  )
}
