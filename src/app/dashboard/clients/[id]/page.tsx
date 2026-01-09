import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Briefcase, Calendar, Mail, Phone, MapPin, Building2, Crown, Pencil, Activity, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { getClient } from '@/app/actions/clients'
import { getTerritories } from '@/app/actions/territories'
import { ProjectFormDialog } from '@/components/projects/project-form-dialog'
import { ProjectActions } from '@/components/projects/project-actions'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { formatDate } from '@/lib/utils'
export const dynamic = 'force-dynamic'
async function ClientDetails({ clientId }: { clientId: string }) {
  const [result, territoriesResult] = await Promise.all([
    getClient(clientId),
    getTerritories()
  ])

  if (!result.success || !result.data) {
    notFound()
  }

  const client = result.data
  const territories = territoriesResult.success ? territoriesResult.data : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/clients">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                {client.name}
              </h1>
              <p className="text-muted-foreground">
                Client since {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <ClientFormDialog
          client={client}
          territories={territories}
          trigger={
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Client
            </Button>
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Client Information */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                <Badge
                  variant={
                    (client as any).status === 'ACTIVE' ? 'success' :
                    (client as any).status === 'PROSPECTIVE' ? 'info' :
                    (client as any).status === 'INACTIVE' ? 'secondary' :
                    'outline'
                  }
                >
                  {(client as any).status === 'ACTIVE' ? 'Active' :
                   (client as any).status === 'INACTIVE' ? 'Inactive' :
                   (client as any).status === 'PROSPECTIVE' ? 'Prospective' :
                   (client as any).status === 'CHURNED' ? 'Churned' :
                   'Active'}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Crown className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Customer Tier</p>
                <Badge
                  variant={
                    client.tier === 'ENTERPRISE' ? 'default' :
                    client.tier === 'VIP' ? 'secondary' :
                    client.tier === 'NEW' ? 'outline' :
                    'outline'
                  }
                >
                  {client.tier === 'STANDARD' ? 'Standard' :
                   client.tier === 'VIP' ? 'VIP' :
                   client.tier === 'NEW' ? 'New Customer' :
                   client.tier === 'ENTERPRISE' ? 'Enterprise' :
                   client.tier}
                </Badge>
              </div>
            </div>

            {(client as any).clientId && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Client ID</p>
                  <p className="text-sm text-muted-foreground font-mono">{(client as any).clientId}</p>
                </div>
              </div>
            )}

            {client.territory && (
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Territory</p>
                  <p className="text-sm text-muted-foreground">{client.territory.name}</p>
                </div>
              </div>
            )}

            {client.email && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <a
                      href={`mailto:${client.email}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                </div>
              </>
            )}

            {client.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Phone</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
              </div>
            )}

            {client.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{client.address}</p>
                </div>
              </div>
            )}

            {client.notes && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Projects</CardTitle>
            <ProjectFormDialog
              clients={[client]}
              defaultClientId={client.id}
            />
          </CardHeader>
          <CardContent>
            {client.projects.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No projects yet"
                description="Create a project to start tracking commissions for this client."
              />
            ) : (
              <div className="space-y-3">
                {client.projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
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
                      {project.description && (
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.createdAt)}
                        </span>
                        {project.commissionPlans.length > 0 && (
                          <span>
                            {project.commissionPlans.length} commission{' '}
                            {project.commissionPlans.length === 1 ? 'plan' : 'plans'}
                          </span>
                        )}
                      </div>
                    </div>
                    <ProjectActions
                      project={{
                        ...project,
                        status: project.status as 'active' | 'completed' | 'cancelled',
                        client,
                        _count: {
                          salesTransactions: project.commissionPlans.length,
                        },
                      }}
                      clients={[client]}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientDetailsSkeleton() {
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

export default async function ClientPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<ClientDetailsSkeleton />}>
      <ClientDetails clientId={id} />
    </Suspense>
  )
}
