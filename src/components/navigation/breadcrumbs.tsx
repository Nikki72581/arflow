'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  title: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

/**
 * Breadcrumbs Component
 * Shows navigation hierarchy
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname)

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}
    >
      {/* Home */}
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Go to dashboard"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Dashboard</span>
      </Link>

      {/* Breadcrumb items */}
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1

        return (
          <div key={item.title} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            {isLast || !item.href ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.title}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.title}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Generate breadcrumbs from pathname
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove leading slash and split
  const paths = pathname.replace(/^\//, '').split('/')

  // Remove 'dashboard' from the start
  if (paths[0] === 'dashboard') {
    paths.shift()
  }

  // Map to readable titles
  const titleMap: Record<string, string> = {
    sales: 'Sales',
    clients: 'Clients',
    projects: 'Projects',
    commissions: 'Commissions',
    plans: 'Commission Plans',
    reports: 'Reports',
    'my-commissions': 'My Commissions',
    'audit-logs': 'Audit Logs',
    settings: 'Settings',
    team: 'Team Members',
    payouts: 'Bulk Payouts',
    new: 'New',
    edit: 'Edit',
  }

  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = '/dashboard'

  paths.forEach((path, index) => {
    // Skip empty paths
    if (!path) return

    // Build cumulative path
    currentPath += `/${path}`

    // Get title
    const title = titleMap[path] || formatTitle(path)

    // Only add href if not the last item
    const isLast = index === paths.length - 1
    breadcrumbs.push({
      title,
      href: isLast ? undefined : currentPath,
    })
  })

  return breadcrumbs
}

/**
 * Format path segment to readable title
 */
function formatTitle(path: string): string {
  // If it's an ID (UUID-like), show as "Details"
  if (path.match(/^[a-z0-9-]{20,}$/i)) {
    return 'Details'
  }

  // Otherwise, capitalize words
  return path
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Page Header with Breadcrumbs
 * Use this at the top of your pages
 */
interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  action?: React.ReactNode
  className?: string
  titleClassName?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={cn('text-3xl font-bold tracking-tight', titleClassName)}>{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}

/**
 * Example usage:
 * 
 * // Auto-generated breadcrumbs
 * <Breadcrumbs />
 * 
 * // Custom breadcrumbs
 * <Breadcrumbs
 *   items={[
 *     { title: 'Clients', href: '/dashboard/clients' },
 *     { title: 'ABC Corp', href: '/dashboard/clients/123' },
 *     { title: 'Edit' }
 *   ]}
 * />
 * 
 * // Page header with breadcrumbs
 * <PageHeader
 *   title="Client Details"
 *   description="View and manage client information"
 *   breadcrumbs={[
 *     { title: 'Clients', href: '/dashboard/clients' },
 *     { title: 'ABC Corp' }
 *   ]}
 *   action={
 *     <Button>Edit Client</Button>
 *   }
 * />
 */
