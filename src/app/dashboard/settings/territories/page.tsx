import { Suspense } from 'react'
import { MapPin, Search, Plus } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { getTerritories } from '@/app/actions/territories'
import { TerritoryFormDialog } from '@/components/territories/territory-form-dialog'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Territories | ARFlow',
  description: 'Manage sales territories for commission calculations',
}

async function TerritoriesTable({ searchQuery }: { searchQuery?: string }) {
  const result = await getTerritories()

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  let territories = result.data || []

  // Filter by search query
  if (searchQuery && territories.length > 0) {
    const query = searchQuery.toLowerCase()
    territories = territories.filter(
      (terr) =>
        terr.name.toLowerCase().includes(query) ||
        terr.description?.toLowerCase().includes(query)
    )
  }

  if (territories.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={Search}
          title="No territories found"
          description={`No territories match "${searchQuery}". Try a different search term.`}
        />
      )
    }

    return (
      <EmptyState
        icon={MapPin}
        title="No territories yet"
        description="Create sales territories to apply different commission rates by region."
      />
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Client Count</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {territories.map((territory) => (
            <TableRow key={territory.id}>
              <TableCell className="font-medium">{territory.name}</TableCell>
              <TableCell>
                {territory.description ? (
                  <span className="text-sm text-muted-foreground truncate max-w-md block">
                    {territory.description}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {territory._count.clients > 0 ? (
                  <Badge variant="secondary">
                    {territory._count.clients}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(territory.createdAt)}
              </TableCell>
              <TableCell>
                <TerritoryFormDialog territory={territory} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TerritoriesTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-8 text-center text-muted-foreground">
        Loading territories...
      </div>
    </div>
  )
}

export default async function TerritoriesPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Sales Territories
          </h1>
          <p className="text-muted-foreground">
            Manage geographic regions for territory-based commission rates
          </p>
        </div>
        <TerritoryFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Territory
            </Button>
          }
        />
      </div>

      <div className="flex items-center gap-4">
        <form className="flex-1" action="/dashboard/settings/territories" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search territories..."
              defaultValue={searchParams.search}
              className="pl-9"
            />
          </div>
        </form>
      </div>

      <Suspense fallback={<TerritoriesTableSkeleton />}>
        <TerritoriesTable searchQuery={searchParams.search} />
      </Suspense>
    </div>
  )
}
