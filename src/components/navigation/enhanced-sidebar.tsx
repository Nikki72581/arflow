'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  FolderKanban,
  DollarSign,
  CheckCircle,
  CreditCard,
  FileText,
  BarChart3,
  User,
  Settings,
  Shield,
  FileSearch,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Receipt,
  Plug,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  title: string
  href?: string
  icon: React.ElementType
  badge?: string | number
  badgeVariant?: 'default' | 'destructive' | 'secondary' | 'success' | 'warning' | 'info'
  children?: NavItem[]
  adminOnly?: boolean
  customerOnly?: boolean
  iconColor?: string
  sectionColor?: string
}

// Navigation structure for ARFlow
const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    title: 'AR Management',
    icon: FileText,
    iconColor: 'text-blue-600 dark:text-blue-400',
    sectionColor: 'border-blue-500/30',
    adminOnly: true,
    children: [
      {
        title: 'Customers',
        href: '/dashboard/customers',
        icon: Users,
        iconColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        title: 'Invoices',
        href: '/dashboard/invoices',
        icon: FileText,
        iconColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        title: 'Payments',
        href: '/dashboard/payments',
        icon: CreditCard,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      },
    ],
  },
  {
    title: 'My Account',
    icon: User,
    iconColor: 'text-purple-600 dark:text-purple-400',
    sectionColor: 'border-purple-500/30',
    customerOnly: true,
    children: [
      {
        title: 'My Invoices',
        href: '/dashboard/portal/invoices',
        icon: FileText,
        iconColor: 'text-purple-600 dark:text-purple-400',
        badge: 'openInvoicesCount',
        badgeVariant: 'info',
      },
      {
        title: 'Payment History',
        href: '/dashboard/portal/payments',
        icon: CreditCard,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        title: 'Account Summary',
        href: '/dashboard/portal/summary',
        icon: BarChart3,
        iconColor: 'text-cyan-600 dark:text-cyan-400',
      },
    ],
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    adminOnly: true,
  },
  {
    title: 'Administration',
    icon: Shield,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    sectionColor: 'border-indigo-500/30',
    adminOnly: true,
    children: [
      {
        title: 'Team Members',
        href: '/dashboard/team',
        icon: Users,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        adminOnly: true,
      },
      {
        title: 'Integrations',
        href: '/dashboard/integrations',
        icon: Plug,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        adminOnly: true,
      },
      {
        title: 'Audit Logs',
        href: '/dashboard/audit-logs',
        icon: FileSearch,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        adminOnly: true,
      },
      {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        adminOnly: true,
      },
    ],
  },
  {
    title: 'Help & Support',
    href: '/dashboard/help',
    icon: HelpCircle,
    iconColor: 'text-muted-foreground',
  },
]

interface EnhancedSidebarProps {
  userRole?: 'ADMIN' | 'CUSTOMER'
  openInvoicesCount?: number
  overdueCount?: number
  userName?: string
  organizationName?: string
}

export function EnhancedSidebar({
  userRole = 'ADMIN',
  openInvoicesCount = 0,
  overdueCount = 0,
  userName,
  organizationName,
}: EnhancedSidebarProps) {
  const pathname = usePathname()

  // Initialize state from localStorage to prevent flashing
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-expanded-sections')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Fall back to default if parsing fails
        }
      }
    }
    return ['AR Management', 'My Account', 'Administration']
  })

  // Persist collapsed state and update CSS variable
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
    // Update CSS variable for sidebar width
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '5rem' : '16rem'
    )
    // Dispatch custom event for sidebar toggle
    window.dispatchEvent(new Event('sidebar-toggle'))
  }, [isCollapsed])

  // Persist expanded sections
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-sections', JSON.stringify(expandedSections))
  }, [expandedSections])

  // Initialize CSS variable on mount
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '5rem' : '16rem'
    )
  }, [])

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title)
        ? prev.filter((s) => s !== title)
        : [...prev, title]
    )
  }

  const isItemVisible = (item: NavItem) => {
    if (item.adminOnly && userRole !== 'ADMIN') return false
    if (item.customerOnly && userRole !== 'CUSTOMER') return false
    return true
  }

  const getBadgeValue = (badge?: string | number) => {
    if (typeof badge === 'number') return badge
    if (badge === 'openInvoicesCount') return openInvoicesCount
    if (badge === 'overdueCount') return overdueCount
    return badge
  }

  const isActive = (href?: string) => {
    if (!href) return false
    // Exact match for dashboard
    if (href === '/dashboard' && pathname === '/dashboard') return true
    // Starts with match for other pages
    if (href !== '/dashboard' && pathname.startsWith(href)) return true
    return false
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
    if (!isItemVisible(item)) return null

    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.includes(item.title)
    const active = isActive(item.href)
    const badgeValue = getBadgeValue(item.badge)

    // Section with children
    if (hasChildren) {
      // In collapsed mode, only show top-level items as icons
      if (isCollapsed && level === 0) {
        return (
          <TooltipProvider key={item.title} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleSection(item.title)}
                  className={cn(
                    'flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent/50 relative',
                  )}
                >
                  <Icon className={cn('h-5 w-5 transition-colors', item.iconColor)} />
                  {badgeValue && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {badgeValue}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      return (
        <div key={item.title}>
          <button
            onClick={() => toggleSection(item.title)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent/50',
              level > 0 && 'pl-9'
            )}
          >
            <Icon className={cn('h-4 w-4 transition-colors', item.iconColor)} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left font-medium">{item.title}</span>
                {badgeValue && (
                  <Badge variant={item.badgeVariant || 'default'} className="ml-auto">
                    {badgeValue}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </>
            )}
          </button>
          {isExpanded && !isCollapsed && (
            <div className={cn(
              'ml-3 mt-1 space-y-1 border-l pl-3',
              item.sectionColor || 'border-border'
            )}>
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    // Regular link item - collapsed mode
    if (isCollapsed && level === 0) {
      return (
        <TooltipProvider key={item.title} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={item.href!}
                className={cn(
                  'flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent/50 relative',
                  active && 'bg-gradient-to-r from-accent to-accent/50 font-medium text-accent-foreground shadow-sm'
                )}
              >
                <Icon className={cn('h-5 w-5 transition-colors', item.iconColor, active && 'scale-110')} />
                {badgeValue && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {badgeValue}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // Regular link item - expanded mode
    return (
      <Link
        key={item.title}
        href={item.href!}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent/50',
          active && 'bg-gradient-to-r from-accent to-accent/50 font-medium text-accent-foreground shadow-sm',
          level > 0 && 'pl-9'
        )}
      >
        <Icon className={cn('h-4 w-4 transition-colors', item.iconColor, active && 'scale-110')} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {badgeValue && (
              <Badge variant={item.badgeVariant || 'default'}>
                {badgeValue}
              </Badge>
            )}
          </>
        )}
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 transition-all duration-300">
      {/* Collapse Toggle Button */}
      <div className="flex items-center justify-between border-b border-border/50 px-2 py-3">
        {!isCollapsed && (
          <span className="px-2 text-xs font-semibold text-muted-foreground">MENU</span>
        )}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  'ml-auto transition-transform hover:bg-accent',
                  isCollapsed && 'mx-auto'
                )}
              >
                {isCollapsed ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Organization & User Info Header */}
      {(organizationName || userName) && !isCollapsed && (
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 p-4">
          <div className="space-y-2">
            {organizationName && (
              <p className="text-sm font-semibold truncate bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">{organizationName}</p>
            )}
            {userName && (
              <p className="text-xs text-muted-foreground truncate">{userName}</p>
            )}
            <Badge
              variant={userRole === 'ADMIN' ? 'default' : 'info'}
              className="w-fit text-xs"
            >
              {userRole}
            </Badge>
          </div>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {(organizationName || userName) && isCollapsed && (
        <div className="flex items-center justify-center px-2 py-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 font-semibold text-primary cursor-default">
                  {userName ? userName.charAt(0).toUpperCase() : organizationName?.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                <div className="space-y-1">
                  {organizationName && <p className="font-semibold">{organizationName}</p>}
                  {userName && <p className="text-xs text-muted-foreground">{userName}</p>}
                  <Badge variant={userRole === 'ADMIN' ? 'default' : 'info'} className="w-fit text-xs">
                    {userRole}
                  </Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => renderNavItem(item))}
        </nav>
      </div>

      {/* Quick Stats */}
      {userRole === 'ADMIN' && (openInvoicesCount > 0 || overdueCount > 0) && (
        <div className="border-t border-border/50 bg-gradient-to-br from-amber-500/5 via-transparent to-red-500/5 p-4">
          {!isCollapsed ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground mb-3">Action Required</p>
              <div className="space-y-2 text-sm">
                {overdueCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 hover:bg-red-500/20 transition-colors">
                    <span className="text-red-900 dark:text-red-100 font-medium">Overdue</span>
                    <Badge variant="destructive">{overdueCount}</Badge>
                  </div>
                )}
                {openInvoicesCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-blue-500/10 px-3 py-2 hover:bg-blue-500/20 transition-colors">
                    <span className="text-blue-900 dark:text-blue-100 font-medium">Open Invoices</span>
                    <Badge variant="info">{openInvoicesCount}</Badge>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {overdueCount > 0 && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                        <CheckCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {overdueCount}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">Overdue Invoices</p>
                      <p className="text-xs text-muted-foreground">{overdueCount} items</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {openInvoicesCount > 0 && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                          {openInvoicesCount}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">Open Invoices</p>
                      <p className="text-xs text-muted-foreground">{openInvoicesCount} items</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
