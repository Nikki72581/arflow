'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Menu,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { EnhancedSidebar } from './enhanced-sidebar'

interface MobileNavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface MobileBottomNavProps {
  userRole?: 'ADMIN' | 'SALESPERSON'
  pendingCount?: number
}

export function MobileBottomNav({
  userRole = 'ADMIN',
  pendingCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname()

  const navItems: MobileNavItem[] = [
    {
      title: 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Sales',
      href: '/dashboard/sales',
      icon: ShoppingCart,
    },
    {
      title: 'Commissions',
      href: '/dashboard/commissions',
      icon: DollarSign,
      badge: pendingCount,
    },
    {
      title: 'Reports',
      href: '/dashboard/reports',
      icon: BarChart3,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {/* Navigation Items */}
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-2 -top-2 h-4 w-4 p-0 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            )
          })}

          {/* More Menu */}
          <Sheet>
            <SheetTrigger className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              <Menu className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex h-full flex-col">
                <div className="border-b p-4">
                  <h2 className="text-lg font-semibold">Menu</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <EnhancedSidebar
                    userRole={userRole}
                    pendingCount={pendingCount}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  )
}

/**
 * Mobile Header with Hamburger Menu
 * Alternative to bottom nav if you prefer top menu
 */
interface MobileHeaderProps {
  userRole?: 'ADMIN' | 'SALESPERSON'
  pendingCount?: number
}

export function MobileHeader({
  userRole = 'ADMIN',
  pendingCount = 0,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Menu Button */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              <span className="font-semibold">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex h-full flex-col">
              <div className="border-b p-4">
                <h2 className="text-lg font-semibold">CommissionFlow</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <EnhancedSidebar
                  userRole={userRole}
                  pendingCount={pendingCount}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/dashboard" className="font-bold">
          CommissionFlow
        </Link>

        {/* Notifications Badge */}
        {pendingCount > 0 && (
          <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 text-xs">
            {pendingCount}
          </Badge>
        )}
      </div>
    </header>
  )
}

/**
 * Usage in layout:
 * 
 * // Bottom navigation (recommended)
 * <MobileBottomNav
 *   userRole={currentUser.role}
 *   pendingCount={stats.pendingCount}
 * />
 * 
 * // Or top hamburger menu
 * <MobileHeader
 *   userRole={currentUser.role}
 *   pendingCount={stats.pendingCount}
 * />
 */
