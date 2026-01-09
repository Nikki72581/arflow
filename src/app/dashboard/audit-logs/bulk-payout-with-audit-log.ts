'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { logBulkPayout } from '@/lib/audit-log'
import { sendBulkPayoutNotifications } from '@/app/actions/email-notifications'

/**
 * Get organization ID for current user
 */
async function getOrganizationId(): Promise<string> {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { organizationId: true },
  })

  if (!user?.organizationId) {
    throw new Error('User not associated with an organization')
  }

  return user.organizationId
}

/**
 * Get current user info for audit logging
 */
async function getCurrentUserInfo() {
  const { userId: clerkId } = await auth()
  
  if (!clerkId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organizationId: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user
}

// ============================================
// BULK PAYOUT WITH AUDIT LOGGING
// ============================================

export interface BulkPayoutInput {
  calculationIds: string[]
  paidDate?: Date
  sendNotifications?: boolean
}

/**
 * Mark multiple approved commissions as paid (WITH AUDIT LOGGING)
 */
export async function bulkMarkAsPaid(input: BulkPayoutInput) {
  try {
    const organizationId = await getOrganizationId()
    const currentUser = await getCurrentUserInfo()
    const paidDate = input.paidDate || new Date()
    const shouldNotify = input.sendNotifications !== false

    // Verify all calculations exist and are approved
    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: input.calculationIds },
        organizationId,
        status: 'APPROVED',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (calculations.length === 0) {
      return {
        success: false,
        error: 'No eligible commissions found to process',
      }
    }

    if (calculations.length !== input.calculationIds.length) {
      return {
        success: false,
        error: `Only ${calculations.length} of ${input.calculationIds.length} commissions are eligible for payout`,
      }
    }

    // Update all to PAID status in a transaction
    const result = await prisma.$transaction(
      calculations.map((calc) =>
        prisma.commissionCalculation.update({
          where: { id: calc.id },
          data: {
            status: 'PAID',
            paidAt: paidDate,
          },
        })
      )
    )

    // Calculate summary
    const totalAmount = calculations.reduce((sum, calc) => sum + calc.amount, 0)
    const uniqueSalespeople = new Set(calculations.map(c => c.userId))

    // CREATE AUDIT LOG (async, don't block)
    logBulkPayout({
      totalAmount,
      commissionsCount: calculations.length,
      salespeopleCount: uniqueSalespeople.size,
      calculationIds: input.calculationIds,
      processedBy: {
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
      },
      organizationId: currentUser.organizationId,
    }).catch((error) => {
      console.error('Failed to create audit log:', error)
      // Don't throw - audit log failures shouldn't break the main operation
    })

    // Send email notifications (async, don't block)
    if (shouldNotify) {
      sendBulkPayoutNotifications(input.calculationIds)
        .then((notifResult) => {
          if (notifResult.success) {
            console.log(`Sent ${notifResult.data?.successCount} payout notifications`)
          } else {
            console.error('Failed to send notifications:', notifResult.error)
          }
        })
        .catch((error) => {
          console.error('Notification error:', error)
        })
    }

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/my-commissions')
    revalidatePath('/dashboard/audit-logs')  // NEW: Refresh audit log page

    return {
      success: true,
      data: {
        processedCount: result.length,
        totalAmount,
        salespeopleCount: uniqueSalespeople.size,
        paidDate,
        notificationsSent: shouldNotify,
        calculations: calculations.map(calc => ({
          id: calc.id,
          amount: calc.amount,
          salespersonName: `${calc.user.firstName} ${calc.user.lastName}`,
          salespersonEmail: calc.user.email,
        })),
      },
    }
  } catch (error) {
    console.error('Error processing bulk payout:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payout',
    }
  }
}

// ... rest of your bulk-payout.ts functions (getPayoutSummary, getPayoutHistory)
