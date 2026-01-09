import { Suspense } from 'react'
import { DollarSign, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { getSalesTransactions } from '@/app/actions/sales-transactions'
import { getProjects } from '@/app/actions/projects'
import { getClients } from '@/app/actions/clients'
import { getUsers } from '@/app/actions/users'
import { getProductCategories } from '@/app/actions/product-categories'
import { getOrganizationSettings } from '@/app/actions/settings'
import { SalesTransactionFormDialog } from '@/components/sales/sales-transaction-form-dialog'
import { SalesImportDialog } from '@/components/sales/sales-import-dialog'
import { SalesTableClient } from '@/components/sales/sales-table-client'
import type { SalesTransactionWithRelations } from '@/lib/types'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Sales | ARFlow',
  description: 'Manage your sales transactions',
}

interface SalesTableProps {
  searchQuery?: string
  projects: any[]
  clients: any[]
  users: any[]
  productCategories: any[]
  requireProjects: boolean
}

async function SalesTable({
  searchQuery,
  projects,
  clients,
  users,
  productCategories,
  requireProjects,
}: SalesTableProps) {
  const salesResult = await getSalesTransactions()

  if (!salesResult.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {salesResult.error}
      </div>
    )
  }

  let sales = (salesResult.data || []) as SalesTransactionWithRelations[]

  // Filter by search query
  if (searchQuery && sales.length > 0) {
    const query = searchQuery.toLowerCase()
    sales = sales.filter(
      (sale) => {
        const clientName = sale.project?.client.name || sale.client?.name
        return (
          sale.description?.toLowerCase().includes(query) ||
          sale.project?.name.toLowerCase().includes(query) ||
          clientName?.toLowerCase().includes(query) ||
          (sale.user.firstName && sale.user.lastName &&
            `${sale.user.firstName} ${sale.user.lastName}`.toLowerCase().includes(query))
        )
      }
    )
  }

  if (sales.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={Search}
          title="No sales found"
          description={`No sales match "${searchQuery}". Try a different search term.`}
        />
      )
    }

    return (
      <EmptyState
        icon={DollarSign}
        title="No sales yet"
        description="Record your first sale to start tracking commissions."
      />
    )
  }

  return (
    <SalesTableClient
      sales={sales}
      searchQuery={searchQuery}
      projects={projects}
      clients={clients}
      users={users}
      productCategories={productCategories}
      requireProjects={requireProjects}
    />
  )
}

function SalesTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-8 text-center text-muted-foreground">
        Loading sales transactions...
      </div>
    </div>
  )
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: { search?: string; create?: string }
}) {
  const [projectsResult, clientsResult, usersResult, productCategoriesResult, orgSettingsResult] = await Promise.all([
    getProjects(),
    getClients(),
    getUsers(),
    getProductCategories(),
    getOrganizationSettings(),
  ])

const projects = projectsResult.success ? (projectsResult.data || []) : []
const clients = clientsResult.success ? (clientsResult.data || []) : []
const users = (usersResult.success ? (usersResult.data || []) : [])
  .filter(user => user.firstName && user.lastName) as Array<{
    id: string
    firstName: string
    lastName: string
    email: string
  }>
const productCategories = productCategoriesResult.success ? (productCategoriesResult.data || []) : []
const requireProjects = orgSettingsResult.success ? (orgSettingsResult.data?.requireProjects ?? false) : false

  const openCreateDialog = searchParams.create === '1' || searchParams.create === 'true'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">Sales Transactions</h1>
          <p className="text-muted-foreground">
            Track all sales and their commission calculations
          </p>
        </div>
        <div className="flex gap-2">
          <SalesImportDialog
            projects={projects}
            clients={clients}
            users={users}
            productCategories={productCategories}
          />
          <SalesTransactionFormDialog
            projects={projects}
            clients={clients}
            users={users}
            productCategories={productCategories}
            requireProjects={requireProjects}
            defaultOpen={openCreateDialog}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <form className="flex-1" action="/dashboard/sales" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search sales..."
              defaultValue={searchParams.search}
              className="pl-9 border-blue-500/20 focus:border-blue-500/40 focus:ring-blue-500/20"
            />
          </div>
        </form>
      </div>

      <Suspense fallback={<SalesTableSkeleton />}>
        <SalesTable
          searchQuery={searchParams.search}
          projects={projects}
          clients={clients}
          users={users}
          productCategories={productCategories}
          requireProjects={requireProjects}
        />
      </Suspense>
    </div>
  )
}
