import { Suspense } from 'react'
import { Package, Search, Plus } from 'lucide-react'
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
import { getProductCategories } from '@/app/actions/product-categories'
import { ProductCategoryFormDialog } from '@/components/product-categories/category-form-dialog'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Product Categories | ARFlow',
  description: 'Manage product categories for commission calculations',
}

async function CategoriesTable({ searchQuery }: { searchQuery?: string }) {
  const result = await getProductCategories()

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  let categories = result.data || []

  // Filter by search query
  if (searchQuery && categories.length > 0) {
    const query = searchQuery.toLowerCase()
    categories = categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
    )
  }

  if (categories.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={Search}
          title="No categories found"
          description={`No categories match "${searchQuery}". Try a different search term.`}
        />
      )
    }

    return (
      <EmptyState
        icon={Package}
        title="No product categories yet"
        description="Create product categories to apply different commission rates by product type."
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
            <TableHead>Sales Count</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>
                {category.description ? (
                  <span className="text-sm text-muted-foreground truncate max-w-md block">
                    {category.description}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {category._count.salesTransactions > 0 ? (
                  <Badge variant="secondary">
                    {category._count.salesTransactions}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(category.createdAt)}
              </TableCell>
              <TableCell>
                <ProductCategoryFormDialog category={category} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CategoriesTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-8 text-center text-muted-foreground">
        Loading product categories...
      </div>
    </div>
  )
}

export default async function ProductCategoriesPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Product Categories
          </h1>
          <p className="text-muted-foreground">
            Organize products for category-based commission rates
          </p>
        </div>
        <ProductCategoryFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          }
        />
      </div>

      <div className="flex items-center gap-4">
        <form className="flex-1" action="/dashboard/settings/product-categories" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search categories..."
              defaultValue={searchParams.search}
              className="pl-9"
            />
          </div>
        </form>
      </div>

      <Suspense fallback={<CategoriesTableSkeleton />}>
        <CategoriesTable searchQuery={searchParams.search} />
      </Suspense>
    </div>
  )
}
