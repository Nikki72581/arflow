'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import type { DateRange } from '@/lib/date-range'

/**
 * Get current user's ID from database
 */
async function getCurrentUserId(): Promise<string> {
  const { userId: clerkId } = await auth()
  
  if (!clerkId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, organizationId: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user.id
}

/**
 * Get organization ID for current user
 */
async function getOrganizationId(): Promise<string> {
  const { userId: clerkId } = await auth()
  
  if (!clerkId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { organizationId: true },
  })

  if (!user?.organizationId) {
    throw new Error('User not associated with an organization')
  }

  return user.organizationId
}

// ============================================
// PERSONAL COMMISSION ACTIONS
// ============================================

/**
 * Get current user's commission calculations
 */
export async function getMyCommissions(dateRange?: DateRange) {
  try {
    const userId = await getCurrentUserId()

    const whereClause: any = {
      userId,
    }

    // Add date range filter if provided
    if (dateRange?.from) {
      whereClause.calculatedAt = {
        gte: dateRange.from,
        ...(dateRange.to && { lte: dateRange.to }),
      }
    }

    const calculations = await prisma.commissionCalculation.findMany({
      where: whereClause,
      include: {
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
      orderBy: {
        calculatedAt: 'desc',
      },
    })

    return {
      success: true,
      data: calculations,
    }
  } catch (error) {
    console.error('Error fetching my commissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch commissions',
    }
  }
}

/**
 * Get current user's commission statistics
 */
export async function getMyCommissionStats(dateRange?: DateRange) {
  try {
    const userId = await getCurrentUserId()

    const whereClause: any = {
      userId,
    }

    // Add date range filter if provided
    if (dateRange?.from) {
      whereClause.calculatedAt = {
        gte: dateRange.from,
        ...(dateRange.to && { lte: dateRange.to }),
      }
    }

    // Build sales transaction where clause
    const salesWhereClause: any = {
      userId,
    }

    if (dateRange?.from) {
      salesWhereClause.transactionDate = {
        gte: dateRange.from,
        lte: dateRange.to,
      }
    }

    const [calculations, salesTransactions] = await Promise.all([
      // Get all calculations
      prisma.commissionCalculation.findMany({
        where: whereClause,
        select: {
          amount: true,
          status: true,
        },
      }),
      // Get sales transactions for commission rate
      prisma.salesTransaction.findMany({
        where: salesWhereClause,
        select: {
          amount: true,
        },
      }),
    ])

    // Calculate totals
    const totalEarned = calculations.reduce((sum, calc) => sum + calc.amount, 0)
    const pending = calculations
      .filter(c => c.status === 'PENDING')
      .reduce((sum, calc) => sum + calc.amount, 0)
    const approved = calculations
      .filter(c => c.status === 'APPROVED')
      .reduce((sum, calc) => sum + calc.amount, 0)
    const paid = calculations
      .filter(c => c.status === 'PAID')
      .reduce((sum, calc) => sum + calc.amount, 0)

    const totalSales = salesTransactions.reduce((sum, sale) => sum + sale.amount, 0)
    const averageCommissionRate = totalSales > 0 ? (totalEarned / totalSales) * 100 : 0

    return {
      success: true,
      data: {
        totalEarned,
        pending,
        approved,
        paid,
        totalSales,
        salesCount: salesTransactions.length,
        commissionsCount: calculations.length,
        averageCommissionRate,
        pendingCount: calculations.filter(c => c.status === 'PENDING').length,
        approvedCount: calculations.filter(c => c.status === 'APPROVED').length,
        paidCount: calculations.filter(c => c.status === 'PAID').length,
      },
    }
  } catch (error) {
    console.error('Error fetching my commission stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    }
  }
}

/**
 * Get current user's sales transactions
 */
export async function getMySales(dateRange?: DateRange) {
  try {
    const userId = await getCurrentUserId()

    const whereClause: any = {
      userId,
    }

    // Add date range filter if provided
    if (dateRange?.from) {
      whereClause.transactionDate = {
        gte: dateRange.from,
        lte: dateRange.to,
      }
    }

    const sales = await prisma.salesTransaction.findMany({
      where: whereClause,
      include: {
        project: {
          include: {
            client: true,
          },
        },
        commissionCalculations: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    })

    return {
      success: true,
      data: sales,
    }
  } catch (error) {
    console.error('Error fetching my sales:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sales',
    }
  }
}

/**
 * Get export data for current user's commissions
 */
export async function getMyCommissionExportData(dateRange?: DateRange) {
  try {
    const userId = await getCurrentUserId()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const whereClause: any = {
      userId,
    }

    // Add date range filter if provided
    if (dateRange?.from) {
      whereClause.calculatedAt = {
        gte: dateRange.from,
        lte: dateRange.to,
      }
    }

    const calculations = await prisma.commissionCalculation.findMany({
      where: whereClause,
      include: {
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
      orderBy: {
        calculatedAt: 'desc',
      },
    })

    // Format for CSV export
const exportData = calculations.map(calc => ({
  salespersonName: `${user.firstName} ${user.lastName}`,
  salespersonEmail: user.email,
  saleDate: calc.salesTransaction.transactionDate,
  saleAmount: calc.salesTransaction.amount,
  commissionAmount: calc.amount,
  commissionPercentage: (calc.amount / calc.salesTransaction.amount) * 100,
  projectName: calc.salesTransaction.project?.name || 'No Project',
  clientName: calc.salesTransaction.project?.client.name || 'No Client',
  commissionPlan: calc.commissionPlan.name,
  status: calc.status,
  approvedDate: calc.approvedAt,
  paidDate: calc.paidAt,
}))

    return {
      success: true,
      data: exportData,
    }
  } catch (error) {
    console.error('Error fetching my export data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch export data',
    }
  }
}
