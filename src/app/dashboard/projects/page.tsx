import { Suspense } from 'react'
import Link from 'next/link'
import { Briefcase, Search } from 'lucide-react'
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
import { getProjects } from '@/app/actions/projects'
import { getClients } from '@/app/actions/clients'
import { ProjectFormDialog } from '@/components/projects/project-form-dialog'
import { ProjectActions } from '@/components/projects/project-actions'
import { formatDate } from '@/lib/utils'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Projects | CommissionFlow',
  description: 'Manage your projects',
}

async function ProjectsTable({ searchQuery }: { searchQuery?: string }) {
  const [projectsResult, clientsResult] = await Promise.all([
    getProjects(),
    getClients(),
  ])

  if (!projectsResult.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {projectsResult.error}
      </div>
    )
  }

  if (!clientsResult.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {clientsResult.error}
      </div>
    )
  }

  let projects = projectsResult.data || []
const clients = clientsResult.data || []

// Filter by search query
if (searchQuery && projects.length > 0) {
  const query = searchQuery.toLowerCase()
  projects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(query) ||
      project.client.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
  )
}

  if (projects.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={Search}
          title="No projects found"
          description={`No projects match "${searchQuery}". Try a different search term.`}
          data-testid="empty-state"
        />
      )
    }

    return (
      <EmptyState
        icon={Briefcase}
        title="No projects yet"
        description="Get started by creating your first project. Projects represent deals or engagements with your clients."
        data-testid="empty-state"
      />
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Commission Plans</TableHead>
            <TableHead>Transactions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} data-testid="project-row">
              <TableCell>
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="font-medium hover:underline"
                  data-testid="project-name"
                >
                  {project.name}
                </Link>
                {project.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-xs">
                    {project.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/clients/${project.client.id}`}
                  className="text-muted-foreground hover:underline"
                >
                  {project.client.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    project.status === 'active'
                      ? 'default'
                      : project.status === 'completed'
                      ? 'secondary'
                      : 'outline'
                  }
                  data-testid="project-status-badge"
                >
                  {project.status}
                </Badge>
              </TableCell>
              <TableCell>
                {project.commissionPlans.length > 0 ? (
                  <Badge variant="secondary">{project.commissionPlans.length}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {project._count.salesTransactions > 0 ? (
                  <Badge variant="secondary">
                    {project._count.salesTransactions}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(project.createdAt)}
              </TableCell>
              <TableCell>
                <ProjectActions
                  project={project as any}
                  clients={clients}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProjectsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-8 text-center text-muted-foreground">Loading projects...</div>
    </div>
  )
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { search?: string; create?: string }
}) {
  const clientsResult = await getClients()
  const clients = clientsResult.data ?? []
  const openCreateDialog = searchParams.create === '1' || searchParams.create === 'true'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and commission plans
          </p>
        </div>
        <ProjectFormDialog clients={clients} defaultOpen={openCreateDialog} />
      </div>

      <div className="flex items-center gap-4">
        <form className="flex-1" action="/dashboard/projects" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search projects..."
              defaultValue={searchParams.search}
              className="pl-9"
              data-testid="project-search-input"
            />
          </div>
        </form>
      </div>

      <Suspense fallback={<ProjectsTableSkeleton />}>
        <ProjectsTable searchQuery={searchParams.search} />
      </Suspense>
    </div>
  )
}
