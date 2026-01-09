'use server'

import { prisma } from '@/lib/db'
import { sendEmail, EMAIL_CONFIG } from '@/lib/email'
import {
  getCommissionApprovedEmail,
  getCommissionPaidEmail,
  getBulkPayoutSummaryEmail,
} from '@/lib/email-templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================
// COMMISSION APPROVAL NOTIFICATION
// ============================================

/**
 * Send email notification when commission is approved
 */
export async function sendCommissionApprovedNotification(calculationId: string) {
  try {
    // Get commission details with all related data
    const calculation = await prisma.commissionCalculation.findUnique({
      where: { id: calculationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        salesTransaction: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
          },
        },
        commissionPlan: true,
      },
    })

    if (!calculation) {
      return { success: false, error: 'Commission not found' }
    }

    if (calculation.status !== 'APPROVED') {
      return { success: false, error: 'Commission is not approved' }
    }

    if (!calculation.approvedAt) {
      return { success: false, error: 'Approval date not set' }
    }

    // Generate email HTML
    const clientName = calculation.salesTransaction.project?.client.name || 'No Client'
    const projectName = calculation.salesTransaction.project?.name || 'No Project'

    const emailHtml = getCommissionApprovedEmail({
      salespersonName: `${calculation.user.firstName} ${calculation.user.lastName}`,
      commissionAmount: calculation.amount,
      saleAmount: calculation.salesTransaction.amount,
      commissionRate: (calculation.amount / calculation.salesTransaction.amount) * 100,
      clientName,
      projectName,
      saleDate: calculation.salesTransaction.transactionDate,
      approvedDate: calculation.approvedAt,
      dashboardUrl: `${APP_URL}/dashboard/my-commissions`,
    })

    // Send email
    const result = await sendEmail({
      to: calculation.user.email,
      subject: `Commission Approved - ${clientName}`,
      html: emailHtml,
    })

    return result
  } catch (error) {
    console.error('Error sending approval notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
    }
  }
}

// ============================================
// COMMISSION PAYMENT NOTIFICATION
// ============================================

/**
 * Send email notification when commission is paid
 */
export async function sendCommissionPaidNotification(calculationId: string) {
  try {
    // Get commission details with all related data
    const calculation = await prisma.commissionCalculation.findUnique({
      where: { id: calculationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        salesTransaction: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
          },
        },
      },
    })

    if (!calculation) {
      return { success: false, error: 'Commission not found' }
    }

    if (calculation.status !== 'PAID') {
      return { success: false, error: 'Commission is not paid' }
    }

    const paidAt = (calculation as any).paidAt
    if (!paidAt) {
      return { success: false, error: 'Payment date not set' }
    }

    // Generate email HTML
    const clientName = calculation.salesTransaction.project?.client.name || 'No Client'
    const projectName = calculation.salesTransaction.project?.name || 'No Project'

    const emailHtml = getCommissionPaidEmail({
      salespersonName: `${calculation.user.firstName} ${calculation.user.lastName}`,
      commissionAmount: calculation.amount,
      saleAmount: calculation.salesTransaction.amount,
      clientName,
      projectName,
      saleDate: calculation.salesTransaction.transactionDate,
      paidDate: paidAt,
      dashboardUrl: `${APP_URL}/dashboard/my-commissions`,
    })

    // Send email
    const result = await sendEmail({
      to: calculation.user.email,
      subject: `Commission Payment Processed - ${clientName}`,
      html: emailHtml,
    })

    return result
  } catch (error) {
    console.error('Error sending payment notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
    }
  }
}

// ============================================
// BULK PAYOUT NOTIFICATIONS
// ============================================

/**
 * Send batch payment notification to each salesperson
 * Groups commissions by user and sends one email per person
 */
export async function sendBulkPayoutNotifications(calculationIds: string[]) {
  try {
    // Get all calculations with user info
    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: calculationIds },
        status: 'PAID',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        salesTransaction: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
          },
        },
      },
    })

    if (calculations.length === 0) {
      return { success: false, error: 'No paid commissions found' }
    }

    // Group by user
    const byUser = calculations.reduce((acc, calc) => {
      const userId = calc.user.id
      if (!acc[userId]) {
        acc[userId] = {
          user: calc.user,
          commissions: [],
          totalAmount: 0,
          paidDate: (calc as any).paidAt,
        }
      }
      acc[userId].commissions.push(calc)
      acc[userId].totalAmount += calc.amount
      return acc
    }, {} as Record<string, any>)

    // Send email to each user
    const results = await Promise.all(
      Object.values(byUser).map(async (userData: any) => {
        const emailHtml = getBulkPayoutSummaryEmail({
          salespersonName: `${userData.user.firstName} ${userData.user.lastName}`,
          totalAmount: userData.totalAmount,
          commissionsCount: userData.commissions.length,
          paidDate: userData.paidDate,
          commissions: userData.commissions.map((c: any) => ({
            amount: c.amount,
            clientName: c.salesTransaction.project?.client.name || 'No Client',
            projectName: c.salesTransaction.project?.name || 'No Project',
          })),
          dashboardUrl: `${APP_URL}/dashboard/my-commissions`,
        })

        return sendEmail({
          to: userData.user.email,
          subject: `Batch Payment Processed - ${userData.commissions.length} Commission${userData.commissions.length !== 1 ? 's' : ''}`,
          html: emailHtml,
        })
      })
    )

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    return {
      success: true,
      data: {
        totalSent: results.length,
        successCount,
        failCount,
      },
    }
  } catch (error) {
    console.error('Error sending bulk notifications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notifications',
    }
  }
}

// ============================================
// ENABLE/DISABLE NOTIFICATIONS
// ============================================

/**
 * Check if email notifications are enabled
 */
export async function areNotificationsEnabled() {
  // Check if Resend API key is configured
  const isConfigured = !!process.env.RESEND_API_KEY
  
  return {
    success: true,
    data: {
      enabled: isConfigured,
      fromEmail: EMAIL_CONFIG.from,
    },
  }
}
