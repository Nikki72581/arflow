import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { getProject } from '@/app/actions/projects'
import { getClients } from '@/app/actions/clients'
import { ProjectFormDialog } from '@/components/projects/project-form-dialog'
import { formatDate, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function ProjectDetails({ projectId }: { projectId: string }) {
  const [projectResult, clientsResult] = await Promise.all([
    getProject(projectId),
    getClients(),
  ])

  if (!projectResult.success || !projectResult.data) {
    notFound()
  }

  const project = projectResult.data
  const clients = clientsResult.success ? clientsResult.data || [] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                {project.name}
              </h1>
              <p className="text-muted-foreground">
                Created {formatDate(project.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProjectFormDialog
            clients={clients}
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              clientId: project.clientId,
              startDate: project.startDate,
              endDate: project.endDate,
              status: project.status,
            }}
            trigger={
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
            }
          />
          <Badge
            variant={
              project.status === 'active'
                ? 'default'
                : project.status === 'completed'
                ? 'secondary'
                : 'outline'
            }
          >
            {project.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Project Information */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Client</p>
              <Link
                href={`/dashboard/clients/${project.client.id}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                {project.client.name}
              </Link>
            </div>

            {project.description && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              </>
            )}

            {(project.startDate || project.endDate) && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-3">
                  {project.startDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(project.startDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">End Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(project.endDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Commission Plans & Transactions */}
        <div className="md:col-span-2 space-y-6">
          {/* Commission Plans */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Commission Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {project.commissionPlans.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="No commission plans yet"
                  description="Create a commission plan to define how commissions are calculated for this project."
                />
              ) : (
                <div className="space-y-3">
                  {project.commissionPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{plan.name}</p>
                          <Badge variant="secondary">
                            {plan.rules.length} {plan.rules.length === 1 ? 'rule' : 'rules'}
                          </Badge>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {project.salesTransactions.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No transactions yet"
                  description="Sales transactions will appear here once they are recorded for this project."
                />
              ) : (
                <div className="space-y-3">
                  {project.salesTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </p>
                          <span className="text-sm text-muted-foreground">
                            by {transaction.user.firstName && transaction.user.lastName
                              ? `${transaction.user.firstName} ${transaction.user.lastName}`
                              : transaction.user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transaction.transactionDate)}
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">
                            {transaction.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProjectDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-muted animate-pulse rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-96 bg-muted animate-pulse rounded" />
        <div className="md:col-span-2 h-96 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

export default async function ProjectPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<ProjectDetailsSkeleton />}>
      <ProjectDetails projectId={id} />
    </Suspense>
  )
}
