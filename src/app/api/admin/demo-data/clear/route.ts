// src/app/api/admin/demo-data/clear/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  try {
    const { userId, orgId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and verify admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, organizationId: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    let organizationId = user.organizationId

    if (orgId) {
      const organization = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
      })

      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      if (organization.id !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden - Organization mismatch' }, { status: 403 })
      }

      organizationId = organization.id
    }

    // Delete all data for this organization
    // Order matters due to foreign key constraints

    // 1. Delete commission calculations (depends on payouts)
    await prisma.commissionCalculation.deleteMany({
      where: { organizationId },
    })

    // 2. Delete payouts
    await prisma.payout.deleteMany({
      where: { organizationId },
    })

    // 3. Delete sales transactions
    await prisma.salesTransaction.deleteMany({
      where: { organizationId },
    })

    // 4. Delete commission rules (depends on commission plans)
    await prisma.commissionRule.deleteMany({
      where: {
        commissionPlan: {
          organizationId,
        },
      },
    })

    // 5. Delete commission plans
    await prisma.commissionPlan.deleteMany({
      where: { organizationId },
    })

    // 6. Delete projects
    await prisma.project.deleteMany({
      where: { organizationId },
    })

    // 7. Delete clients
    await prisma.client.deleteMany({
      where: { organizationId },
    })

    // 8. Delete product categories
    await prisma.productCategory.deleteMany({
      where: { organizationId },
    })

    // 9. Delete territories
    await prisma.territory.deleteMany({
      where: { organizationId },
    })

    // 10. Delete integration sync logs
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    })

    if (integration) {
      await prisma.integrationSyncLog.deleteMany({
        where: { integrationId: integration.id },
      })

      // 11. Delete salesperson mappings
      await prisma.acumaticaSalespersonMapping.deleteMany({
        where: { integrationId: integration.id },
      })

      // 12. Delete the integration itself
      await prisma.acumaticaIntegration.delete({
        where: { id: integration.id },
      })
    }

    // 13. Delete audit logs
    await prisma.auditLog.deleteMany({
      where: { organizationId },
    })

    // 14. Delete placeholder users (keep real invited users)
    await prisma.user.deleteMany({
      where: {
        organizationId,
        isPlaceholder: true,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'All demo data cleared successfully'
    })
  } catch (error: any) {
    console.error('Error clearing demo data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
