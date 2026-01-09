import { LucideIcon, Inbox, Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

/**
 * Generic Empty State Component
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="bg-muted rounded-full p-6">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {action && (
            <Button onClick={action.onClick}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Empty State for Cards/Tables
 */
export function EmptyTableState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: Omit<EmptyStateProps, 'secondaryAction'>) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          {action && (
            <Button onClick={action.onClick}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty Search Results
 */
export function EmptySearchState({
  searchQuery,
  onClear,
}: {
  searchQuery: string
  onClear: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="bg-muted rounded-full p-6">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-sm text-muted-foreground mb-6">
          No results found for "<span className="font-medium">{searchQuery}</span>". 
          Try adjusting your search or filters.
        </p>
        <Button variant="outline" onClick={onClear}>
          Clear Search
        </Button>
      </div>
    </div>
  )
}

/**
 * Empty Filter Results
 */
export function EmptyFilterState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="bg-muted rounded-full p-6">
            <Filter className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">No matches found</h3>
        <p className="text-sm text-muted-foreground mb-6">
          No items match your current filters. Try adjusting or clearing them.
        </p>
        <Button variant="outline" onClick={onClear}>
          Clear Filters
        </Button>
      </div>
    </div>
  )
}

/**
 * Coming Soon State
 */
export function ComingSoonState({ feature }: { feature: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 rounded-full p-6">
            <Inbox className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          {feature} is currently under development and will be available soon.
        </p>
      </div>
    </div>
  )
}
