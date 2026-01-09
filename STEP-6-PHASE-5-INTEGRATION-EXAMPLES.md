# Step 6 Phase 5: Integration Examples

## 🎯 How to Use the New Components

### 1. Loading States

#### Replace hardcoded skeletons with reusable components:

```tsx
// Before
<div className="flex items-center gap-4">
  <Skeleton className="h-12 w-12" />
  <Skeleton className="h-4 w-32" />
</div>

// After
import { TableSkeleton, StatsCardSkeleton, PageLoading } from '@/components/ui/loading'

// In your loading.tsx
export default function Loading() {
  return <PageLoading message="Loading commissions..." />
}

// In your component
{isLoading ? (
  <TableSkeleton rows={5} columns={6} />
) : (
  <CommissionsTable data={data} />
)}
```

#### Stats Dashboard with Loading:

```tsx
import { StatsCardSkeleton } from '@/components/ui/loading'

export function DashboardStats() {
  const { data, isLoading } = useQuery('stats')
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  return <StatsCards data={data} />
}
```

---

### 2. Error Boundaries

#### Wrap your pages with error boundaries:

```tsx
// app/dashboard/commissions/page.tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function CommissionsPage() {
  return (
    <ErrorBoundary>
      <CommissionsContent />
    </ErrorBoundary>
  )
}
```

#### Inline errors in forms:

```tsx
import { InlineError } from '@/components/ui/error-boundary'
import { useAppToast } from '@/hooks/use-app-toast'

export function SaleForm() {
  const [error, setError] = useState<string | null>(null)
  const toast = useAppToast()
  
  async function onSubmit(data: FormData) {
    try {
      const result = await createSale(data)
      if (!result.success) {
        setError(result.error)
        toast.saveFailed(result.error)
        return
      }
      toast.created('Sale')
    } catch (err) {
      setError('An unexpected error occurred')
      toast.saveFailed()
    }
  }
  
  return (
    <form onSubmit={onSubmit}>
      {error && <InlineError error={error} onRetry={() => setError(null)} />}
      {/* form fields */}
    </form>
  )
}
```

---

### 3. Empty States

#### Replace empty divs with meaningful empty states:

```tsx
import { EmptyState } from '@/components/shared/empty-states'
import { DollarSign } from 'lucide-react'

export function CommissionsList({ commissions }) {
  if (commissions.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No commissions yet"
        description="Create your first sale to generate commissions."
        action={{
          label: "Create Sale",
          onClick: () => router.push('/dashboard/sales/new')
        }}
      />
    )
  }
  
  return <CommissionsTable data={commissions} />
}
```

#### Empty search results:

```tsx
import { EmptySearchState, EmptyFilterState } from '@/components/shared/empty-states'

export function SearchableList({ items, searchQuery, filters }) {
  if (items.length === 0 && searchQuery) {
    return (
      <EmptySearchState
        searchQuery={searchQuery}
        onClear={() => setSearchQuery('')}
      />
    )
  }
  
  if (items.length === 0 && hasActiveFilters) {
    return (
      <EmptyFilterState onClear={clearAllFilters} />
    )
  }
  
  return <ItemsList items={items} />
}
```

---

### 4. Mobile-Responsive Tables

#### Convert desktop-only tables:

```tsx
import { HybridTable } from '@/components/shared/responsive-table'

export function CommissionsTable({ commissions }) {
  return (
    <HybridTable
      headers={['Date', 'Client', 'Amount', 'Status', 'Actions']}
      rows={commissions.map(c => ({
        id: c.id,
        cells: [
          formatDate(c.createdAt),
          c.sale.client.name,
          formatCurrency(c.amount),
          <StatusBadge status={c.status} />,
          <ActionButtons commission={c} />
        ],
        // Custom mobile layout
        mobileCard: (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{c.sale.client.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(c.createdAt)}
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{formatCurrency(c.amount)}</span>
              <ActionButtons commission={c} />
            </div>
          </div>
        )
      }))}
      emptyState={<EmptyState title="No commissions" />}
    />
  )
}
```

---

### 5. Toast Notifications

#### Replace manual toast calls:

```tsx
// Before
toast({
  title: 'Success',
  description: 'Commission approved successfully'
})

// After
import { useAppToast } from '@/hooks/use-app-toast'

export function ApproveButton({ commissionId }) {
  const toast = useAppToast()
  
  async function handleApprove() {
    const result = await approveCommission(commissionId)
    
    if (result.success) {
      toast.commissionApproved()
    } else {
      toast.saveFailed(result.error)
    }
  }
  
  return <Button onClick={handleApprove}>Approve</Button>
}
```

#### Common patterns:

```tsx
const toast = useAppToast()

// Simple actions
toast.saved()
toast.deleted('Commission Plan')
toast.created('New Client')

// Errors
toast.saveFailed('Invalid amount')
toast.networkError()
toast.unauthorized()

// Commission-specific
toast.commissionApproved()
toast.commissionPaid()
toast.bulkPayoutProcessed(15, '$12,345.67')
toast.exportSuccess(100)
```

---

### 6. Accessibility

#### Add ARIA labels to buttons:

```tsx
import { ARIA_LABELS } from '@/lib/accessibility'

// Icon-only buttons need labels
<button aria-label={ARIA_LABELS.approve('commission')}>
  <CheckIcon />
</button>

<button aria-label={ARIA_LABELS.delete('sale')}>
  <TrashIcon />
</button>
```

#### Keyboard navigation:

```tsx
import { handleKeyboardAction } from '@/lib/accessibility'

<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => handleKeyboardAction(e, handleClick)}
  onClick={handleClick}
  className="cursor-pointer"
>
  Clickable div (accessible)
</div>
```

#### Loading states for screen readers:

```tsx
{isLoading && (
  <div role="status" aria-live="polite" aria-busy="true">
    <LoadingSpinner />
    <span className="sr-only">{ARIA_LABELS.loading}</span>
  </div>
)}
```

---

## 🎨 Complete Example: Enhanced Commission List

```tsx
'use client'

import { useState } from 'react'
import { ErrorBoundary, InlineError } from '@/components/ui/error-boundary'
import { TableSkeleton } from '@/components/ui/loading'
import { EmptyState, EmptySearchState } from '@/components/shared/empty-states'
import { HybridTable } from '@/components/shared/responsive-table'
import { useAppToast } from '@/hooks/use-app-toast'
import { ARIA_LABELS } from '@/lib/accessibility'

export default function CommissionsPage() {
  return (
    <ErrorBoundary>
      <CommissionsContent />
    </ErrorBoundary>
  )
}

function CommissionsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useAppToast()
  
  // Fetch data
  const { data: commissions } = useCommissions()
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Commissions</h1>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <InlineError
        error={error}
        onRetry={() => {
          setError(null)
          refetch()
        }}
      />
    )
  }
  
  // Filter commissions
  const filtered = commissions.filter(c =>
    c.sale.client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Empty state
  if (commissions.length === 0) {
    return (
      <EmptyState
        title="No commissions yet"
        description="Create your first sale to generate commissions."
        action={{
          label: "Create Sale",
          onClick: () => router.push('/dashboard/sales/new')
        }}
      />
    )
  }
  
  // Empty search
  if (filtered.length === 0 && searchQuery) {
    return (
      <EmptySearchState
        searchQuery={searchQuery}
        onClear={() => setSearchQuery('')}
      />
    )
  }
  
  // Handle approval
  async function handleApprove(id: string) {
    const result = await approveCommission(id)
    
    if (result.success) {
      toast.commissionApproved()
    } else {
      toast.saveFailed(result.error)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Commissions</h1>
        <p className="text-muted-foreground">
          Manage and track all commission calculations
        </p>
      </div>
      
      {/* Search */}
      <Input
        placeholder="Search by client..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label={ARIA_LABELS.search('commissions')}
      />
      
      {/* Table */}
      <HybridTable
        headers={['Date', 'Client', 'Amount', 'Status', 'Actions']}
        rows={filtered.map(c => ({
          id: c.id,
          cells: [
            formatDate(c.createdAt),
            c.sale.client.name,
            formatCurrency(c.amount),
            <StatusBadge status={c.status} />,
            <Button
              size="sm"
              onClick={() => handleApprove(c.id)}
              aria-label={ARIA_LABELS.approveCommission(formatCurrency(c.amount))}
            >
              Approve
            </Button>
          ]
        }))}
      />
    </div>
  )
}
```

---

## 🎯 Quick Wins

1. **Add error boundary** to each major page (5 min)
2. **Replace skeletons** with loading components (10 min)
3. **Add empty states** to all lists (10 min)
4. **Switch to toast hook** for notifications (5 min)
5. **Add ARIA labels** to icon buttons (10 min)

Total: 40 minutes for huge UX improvement!
