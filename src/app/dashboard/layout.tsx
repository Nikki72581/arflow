// src/app/dashboard/layout.tsx
import { SidebarWrapper } from '@/components/navigation/sidebar-wrapper'
import { EnhancedHeader } from '@/components/navigation/enhanced-header'
import { MobileBottomNav } from '@/components/navigation/mobile-navigation'
import { getCurrentUserWithOrg } from '@/lib/auth'

import { prisma } from '@/lib/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use auth helper that ensures user has completed onboarding
  const user = await getCurrentUserWithOrg()

  // Get pending count for badges
  // Admins see all pending approvals in org, salespeople see only their own
  const pendingCount = await prisma.commissionCalculation.count({
    where: {
      status: 'PENDING',
      ...(user.role === 'ADMIN'
        ? { user: { organizationId: user.organizationId } }
        : { user: { clerkId: user.clerkId } }),
    },
  })

  const userName = `${user.firstName} ${user.lastName}`
  const userEmail = user.email
  const userRole = user.role
  const organizationName = user.organization.name
  const organizationSlug = user.organization.slug

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <EnhancedHeader
        userName={userName}
        userEmail={userEmail}
        userRole={userRole as 'ADMIN' | 'SALESPERSON'}
        organizationName={organizationName}
        organizationSlug={organizationSlug}
        notificationCount={pendingCount}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Now sticky and fixed height */}
        <aside className="hidden border-r md:block md:sticky md:top-0 md:h-[calc(100vh-4rem)] md:overflow-y-auto transition-all duration-300 ease-in-out">
          <SidebarWrapper
            userRole={userRole as 'ADMIN' | 'SALESPERSON'}
            pendingCount={pendingCount}
            userName={userName}
            organizationName={organizationName}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        userRole={userRole as 'ADMIN' | 'SALESPERSON'}
        pendingCount={pendingCount}
      />
    </div>
  )
}