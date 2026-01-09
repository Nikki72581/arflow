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

  // Get open/overdue invoice count for badges
  // Admins see all invoices in org, customers see only their own
  const pendingCount = await prisma.arDocument.count({
    where: {
      status: 'OPEN',
      organizationId: user.organizationId,
      ...(user.role === 'CUSTOMER' && user.customerId
        ? { customerId: user.customerId }
        : {}),
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
        userRole={userRole as 'ADMIN' | 'CUSTOMER'}
        organizationName={organizationName}
        organizationSlug={organizationSlug}
        notificationCount={pendingCount}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Now sticky and fixed height */}
        <aside className="hidden border-r md:block md:sticky md:top-0 md:h-[calc(100vh-4rem)] md:overflow-y-auto transition-all duration-300 ease-in-out">
          <SidebarWrapper
            userRole={userRole as 'ADMIN' | 'CUSTOMER'}
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
        userRole={userRole as 'ADMIN' | 'CUSTOMER'}
        pendingCount={pendingCount}
      />
    </div>
  )
}