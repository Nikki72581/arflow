'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

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

// ============================================
// BULK PAYOUT ACTIONS
// ============================================

export interface BulkPayoutInput {
  calculationIds: string[]
  paidDate?: Date
}

/**
 * Mark multiple approved commissions as paid
 */
export async function bulkMarkAsPaid(input: BulkPayoutInput) {
  try {
    const organizationId = await getOrganizationId()
    const paidDate = input.paidDate || new Date()

    // Verify all calculations exist and are approved
    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: input.calculationIds },
        organizationId,
        status: 'APPROVED', // Only process approved commissions
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

    revalidatePath('/dashboard/commissions')

    return {
      success: true,
      data: {
        processedCount: result.length,
        totalAmount,
        salespeopleCount: uniqueSalespeople.size,
        paidDate,
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

/**
 * Get summary of selected commissions before payout
 */
export async function getPayoutSummary(calculationIds: string[]) {
  try {
    const organizationId = await getOrganizationId()

    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: calculationIds },
        organizationId,
        status: 'APPROVED',
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
          select: {
            amount: true,
            transactionDate: true,
          },
        },
      },
    })

    if (calculations.length === 0) {
      return {
        success: false,
        error: 'No eligible commissions found',
      }
    }

    const totalAmount = calculations.reduce((sum, calc) => sum + calc.amount, 0)
    
    // Group by salesperson
    const bySalesperson = calculations.reduce((acc, calc) => {
      const userId = calc.user.id
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          name: `${calc.user.firstName} ${calc.user.lastName}`,
          email: calc.user.email,
          commissionsCount: 0,
          totalAmount: 0,
          commissionIds: [],
        }
      }
      acc[userId].commissionsCount++
      acc[userId].totalAmount += calc.amount
      acc[userId].commissionIds.push(calc.id)
      return acc
    }, {} as Record<string, any>)

    return {
      success: true,
      data: {
        totalCommissions: calculations.length,
        totalAmount,
        salespeopleCount: Object.keys(bySalesperson).length,
        salespeople: Object.values(bySalesperson),
        earliestSaleDate: calculations.reduce((earliest, calc) => {
          const date = calc.salesTransaction.transactionDate
          return !earliest || date < earliest ? date : earliest
        }, null as Date | null),
        latestSaleDate: calculations.reduce((latest, calc) => {
          const date = calc.salesTransaction.transactionDate
          return !latest || date > latest ? date : latest
        }, null as Date | null),
      },
    }
  } catch (error) {
    console.error('Error getting payout summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    }
  }
}

/**
 * Get payout history/batches
 */
export async function getPayoutHistory() {
  try {
    const organizationId = await getOrganizationId()

    // Get all paid commissions grouped by payment date
    const paidCommissions = await prisma.commissionCalculation.findMany({
      where: {
        organizationId,
        status: 'PAID',
        paidAt: { not: null },
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
      orderBy: {
        paidAt: 'desc',
      },
    })

    // Group by paidAt date (group payments made on same day)
    const batches = paidCommissions.reduce((acc, calc) => {
      const paidDate = (calc as any).paidAt
      if (!paidDate) return acc

      const dateKey = paidDate.toISOString().split('T')[0] // YYYY-MM-DD

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: paidDate,
          commissionsCount: 0,
          totalAmount: 0,
          salespeopleCount: new Set(),
          commissions: [],
        }
      }

      acc[dateKey].commissionsCount++
      acc[dateKey].totalAmount += calc.amount
      acc[dateKey].salespeopleCount.add(calc.userId)
      acc[dateKey].commissions.push({
        id: calc.id,
        amount: calc.amount,
        salespersonName: `${calc.user.firstName} ${calc.user.lastName}`,
        salespersonEmail: calc.user.email,
      })

      return acc
    }, {} as Record<string, any>)

    // Convert to array and format
    const history = Object.values(batches).map((batch: any) => ({
      date: batch.date,
      commissionsCount: batch.commissionsCount,
      totalAmount: batch.totalAmount,
      salespeopleCount: batch.salespeopleCount.size,
      commissions: batch.commissions,
    }))

    return {
      success: true,
      data: history,
    }
  } catch (error) {
    console.error('Error getting payout history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history',
    }
  }
}

/**
 * Export selected commissions to CSV format
 */
export async function exportCommissionsToCSV(calculationIds: string[]) {
  try {
    const organizationId = await getOrganizationId()

    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: calculationIds },
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
        salesTransaction: {
          select: {
            amount: true,
            transactionDate: true,
            invoiceNumber: true,
            project: {
              select: {
                name: true,
                client: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        commissionPlan: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        calculatedAt: 'asc',
      },
    })

    if (calculations.length === 0) {
      return {
        success: false,
        error: 'No eligible commissions found to export',
      }
    }

    // Create CSV headers
    const headers = [
      'Salesperson Name',
      'Email',
      'Client',
      'Project',
      'Sale Date',
      'Invoice Number',
      'Sale Amount',
      'Commission Amount',
      'Commission Plan',
      'Status',
      'Approved Date',
    ]

    // Create CSV rows
    const rows = calculations.map((calc) => [
      `${calc.user.firstName} ${calc.user.lastName}`,
      calc.user.email,
      calc.salesTransaction.project?.client.name || 'N/A',
      calc.salesTransaction.project?.name || 'N/A',
      calc.salesTransaction.transactionDate.toISOString().split('T')[0],
      calc.salesTransaction.invoiceNumber || 'N/A',
      calc.salesTransaction.amount.toFixed(2),
      calc.amount.toFixed(2),
      calc.commissionPlan.name,
      calc.status,
      calc.approvedAt?.toISOString().split('T')[0] || 'N/A',
    ])

    // Combine headers and rows into CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(',')
      ),
    ].join('\n')

    return {
      success: true,
      data: {
        csv: csvContent,
        filename: `commission-payout-${new Date().toISOString().split('T')[0]}.csv`,
        recordCount: calculations.length,
      },
    }
  } catch (error) {
    console.error('Error exporting commissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export commissions',
    }
  }
}
