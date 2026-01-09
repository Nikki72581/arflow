'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { bulkApproveSchema } from '@/lib/validations/sales-transaction'
import type { BulkApproveInput } from '@/lib/validations/sales-transaction'
import { sendCommissionApprovedNotification } from '@/app/actions/email-notifications'

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
// COMMISSION CALCULATION ACTIONS
// ============================================

/**
 * Get all commission calculations
 */
export async function getCommissionCalculations() {
  try {
    const organizationId = await getOrganizationId()

    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        organizationId,
      },
      include: {
        salesTransaction: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
            client: true,
          },
        },
        user: true,
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
    console.error('Error fetching commission calculations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch calculations',
    }
  }
}

/**
 * Get a single commission calculation by ID
 */
export async function getCommissionCalculation(calculationId: string) {
  try {
    const organizationId = await getOrganizationId()

    const calculation = await prisma.commissionCalculation.findFirst({
      where: {
        id: calculationId,
        organizationId,
      },
      include: {
        salesTransaction: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
            client: true,
          },
        },
        user: true,
        commissionPlan: {
          include: {
            rules: true,
          },
        },
      },
    })

    if (!calculation) {
      throw new Error('Commission calculation not found')
    }

    return {
      success: true,
      data: calculation,
    }
  } catch (error) {
    console.error('Error fetching commission calculation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch calculation',
    }
  }
}

/**
 * Approve a single commission calculation
 */
export async function approveCalculation(calculationId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify calculation belongs to organization
    const existingCalculation = await prisma.commissionCalculation.findFirst({
      where: {
        id: calculationId,
        organizationId,
      },
    })

    if (!existingCalculation) {
      throw new Error('Commission calculation not found')
    }

    if (existingCalculation.status === 'PAID') {
      throw new Error('Cannot approve a commission that has already been paid')
    }

    // Update status to APPROVED
    const calculation = await prisma.commissionCalculation.update({
      where: { id: calculationId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      include: {
        salesTransaction: true,
        user: true,
        commissionPlan: true,
      },

    })

    // Send notification (async, non-blocking)
    sendCommissionApprovedNotification(calculationId).catch((error) => {
      console.error('Failed to send approval notification:', error)
    })

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/commissions/pending')
    revalidatePath(`/dashboard/commissions/${calculationId}`)
    
    return {
      success: true,
      data: calculation,
    }
  } catch (error) {
    console.error('Error approving calculation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve calculation',
    }
  }
}

/**
 * Bulk approve multiple commission calculations
 */
export async function bulkApproveCalculations(data: BulkApproveInput) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = bulkApproveSchema.parse(data)

    // Verify all calculations belong to organization and aren't paid
    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: validatedData.calculationIds },
        organizationId,
      },
    })

    if (calculations.length !== validatedData.calculationIds.length) {
      throw new Error('Some calculations were not found')
    }

    const hasPaidCalculations = calculations.some((calc) => calc.status === 'PAID')
    if (hasPaidCalculations) {
      throw new Error('Cannot approve calculations that have already been paid')
    }

    // Update all to APPROVED
    await prisma.commissionCalculation.updateMany({
      where: {
        id: { in: validatedData.calculationIds },
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    })

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/commissions/pending')
    
    return {
      success: true,
      message: `${validatedData.calculationIds.length} calculation(s) approved successfully`,
    }
  } catch (error) {
    console.error('Error bulk approving calculations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk approve calculations',
    }
  }
}

/**
 * Mark a calculation as paid
 */
export async function markCalculationPaid(calculationId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify calculation belongs to organization
    const existingCalculation = await prisma.commissionCalculation.findFirst({
      where: {
        id: calculationId,
        organizationId,
      },
    })

    if (!existingCalculation) {
      throw new Error('Commission calculation not found')
    }

    if (existingCalculation.status === 'PENDING') {
      throw new Error('Cannot mark pending calculation as paid. Approve it first.')
    }

    if (existingCalculation.status === 'PAID') {
      throw new Error('This commission has already been marked as paid')
    }

    // Update status to PAID
    const calculation = await prisma.commissionCalculation.update({
      where: { id: calculationId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        salesTransaction: true,
        user: true,
        commissionPlan: true,
      },
    })

    revalidatePath('/dashboard/commissions')
    revalidatePath(`/dashboard/commissions/${calculationId}`)
    
    return {
      success: true,
      data: calculation,
    }
  } catch (error) {
    console.error('Error marking calculation as paid:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark as paid',
    }
  }
}

/**
 * Reject a commission calculation
 */
export async function rejectCalculation(calculationId: string, reason?: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify calculation belongs to organization
    const existingCalculation = await prisma.commissionCalculation.findFirst({
      where: {
        id: calculationId,
        organizationId,
      },
    })

    if (!existingCalculation) {
      throw new Error('Commission calculation not found')
    }

    if (existingCalculation.status === 'PAID') {
      throw new Error('Cannot reject a commission that has already been paid')
    }

    // Delete the calculation (rejection)
    await prisma.commissionCalculation.delete({
      where: { id: calculationId },
    })

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/commissions/pending')
    
    return {
      success: true,
      message: 'Commission calculation rejected successfully',
    }
  } catch (error) {
    console.error('Error rejecting calculation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject calculation',
    }
  }
}

/**
 * Bulk reject multiple commission calculations
 */
export async function bulkRejectCalculations(data: BulkApproveInput) {
  try {
    const organizationId = await getOrganizationId()

    const validatedData = bulkApproveSchema.parse(data)

    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: validatedData.calculationIds },
        organizationId,
      },
    })

    if (calculations.length !== validatedData.calculationIds.length) {
      throw new Error('Some calculations were not found')
    }

    const hasPaidCalculations = calculations.some((calc) => calc.status === 'PAID')
    if (hasPaidCalculations) {
      throw new Error('Cannot reject calculations that have already been paid')
    }

    await prisma.commissionCalculation.deleteMany({
      where: {
        id: { in: validatedData.calculationIds },
      },
    })

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/commissions/pending')

    return {
      success: true,
      message: `${validatedData.calculationIds.length} calculation(s) rejected successfully`,
    }
  } catch (error) {
    console.error('Error bulk rejecting calculations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk reject calculations',
    }
  }
}

/**
 * Get commission statistics
 */
export async function getCommissionStats() {
  try {
    const organizationId = await getOrganizationId()

    const [totalCalculations, totalAmount, pendingAmount, approvedAmount, paidAmount] =
      await Promise.all([
        // Total calculations count
        prisma.commissionCalculation.count({
          where: { organizationId },
        }),
        // Total amount
        prisma.commissionCalculation.aggregate({
          where: { organizationId },
          _sum: { amount: true },
        }),
        // Pending amount
        prisma.commissionCalculation.aggregate({
          where: {
            organizationId,
            status: 'PENDING',
          },
          _sum: { amount: true },
        }),
        // Approved amount
        prisma.commissionCalculation.aggregate({
          where: {
            organizationId,
            status: 'APPROVED',
          },
          _sum: { amount: true },
        }),
        // Paid amount
        prisma.commissionCalculation.aggregate({
          where: {
            organizationId,
            status: 'PAID',
          },
          _sum: { amount: true },
        }),
      ])

    return {
      success: true,
      data: {
        totalCalculations,
        totalAmount: totalAmount._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0,
        approvedAmount: approvedAmount._sum.amount || 0,
        paidAmount: paidAmount._sum.amount || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching commission stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    }
  }
}

/**
 * Get calculations for a specific user (salesperson)
 */
export async function getUserCalculations(userId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify user belongs to organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        userId,
        organizationId,
      },
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
    console.error('Error fetching user calculations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user calculations',
    }
  }
}

/**
 * Recalculate commissions for unapproved/unpaid status
 * This is useful when commission rules change or transaction amounts are corrected
 */
export async function recalculateCommissions(calculationIds: string[]) {
  try {
    const organizationId = await getOrganizationId()

    if (calculationIds.length === 0) {
      throw new Error('No calculations selected for recalculation')
    }

    // Fetch calculations with all necessary data for recalculation
    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: calculationIds },
        organizationId,
        status: { in: ['PENDING', 'CALCULATED'] }, // Only recalculate non-approved, non-paid
      },
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
        commissionPlan: {
          include: {
            rules: true,
          },
        },
        user: true,
      },
    })

    if (calculations.length === 0) {
      throw new Error('No eligible calculations found for recalculation (only PENDING or CALCULATED status can be recalculated)')
    }

    // Import calculator and net sales calculator
    const { calculateCommissionWithPrecedence } = await import('@/lib/commission-calculator')
    const { calculateNetSalesAmount } = await import('@/lib/net-sales-calculator')

    let recalculatedCount = 0
    let unchangedCount = 0
    const errors: string[] = []

    // Recalculate each commission
    for (const calc of calculations) {
      try {
        const { salesTransaction, commissionPlan } = calc

        // Calculate net sales amount
        const netAmount = await calculateNetSalesAmount(salesTransaction.id)

        // Build calculation context from transaction
        const context = {
          grossAmount: salesTransaction.amount,
          netAmount,
          transactionDate: salesTransaction.transactionDate,
          customerId: salesTransaction.project?.clientId,
          customerTier: salesTransaction.project?.client?.tier,
          projectId: salesTransaction.projectId || undefined,
          territoryId: salesTransaction.project?.client?.territoryId || undefined,
          commissionBasis: commissionPlan.commissionBasis,
        }

        // Recalculate with current rules
        const result = calculateCommissionWithPrecedence(
          context,
          commissionPlan.rules as any
        )

        // Update if amount changed
        if (result.finalAmount !== calc.amount) {
          await prisma.commissionCalculation.update({
            where: { id: calc.id },
            data: {
              amount: result.finalAmount,
              calculatedAt: new Date(),
              metadata: result as any,
            },
          })
          recalculatedCount++
        } else {
          unchangedCount++
        }
      } catch (error) {
        console.error(`Error recalculating commission ${calc.id}:`, error)
        errors.push(`Failed to recalculate commission for ${calc.user.firstName} ${calc.user.lastName}`)
      }
    }

    revalidatePath('/dashboard/commissions')

    return {
      success: true,
      message: `Recalculated ${recalculatedCount} commission(s). ${unchangedCount} unchanged.`,
      data: {
        recalculatedCount,
        unchangedCount,
        errors,
      },
    }
  } catch (error) {
    console.error('Error recalculating commissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recalculate commissions',
    }
  }
}

// ============================================
// BULK RECALCULATION UTILITY
// ============================================

export interface RecalculationFilters {
  dateFrom?: Date
  dateTo?: Date
  userIds?: string[]
  planIds?: string[]
  projectIds?: string[]
  statuses?: ('PENDING' | 'CALCULATED')[]
}

export interface CalculationPreview {
  id: string
  amount: number
  status: string
  calculatedAt: Date
  salesTransaction: {
    id: string
    amount: number
    transactionDate: Date
    invoiceNumber: string | null
  }
  user: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  commissionPlan: {
    id: string
    name: string
  }
  project: {
    id: string
    name: string
  } | null
}

/**
 * Find commission calculations that match the given filters
 * Used to preview what will be recalculated before running the operation
 */
export async function findCalculationsForRecalculation(filters: RecalculationFilters) {
  try {
    const organizationId = await getOrganizationId()

    // Build where clause
    const where: any = {
      organizationId,
      status: { in: filters.statuses || ['PENDING', 'CALCULATED'] },
    }

    // Filter by date range (transaction date)
    if (filters.dateFrom || filters.dateTo) {
      where.salesTransaction = {
        ...where.salesTransaction,
        transactionDate: {},
      }
      if (filters.dateFrom) {
        where.salesTransaction.transactionDate.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.salesTransaction.transactionDate.lte = filters.dateTo
      }
    }

    // Filter by salespeople
    if (filters.userIds && filters.userIds.length > 0) {
      where.userId = { in: filters.userIds }
    }

    // Filter by commission plans
    if (filters.planIds && filters.planIds.length > 0) {
      where.commissionPlanId = { in: filters.planIds }
    }

    // Filter by projects
    if (filters.projectIds && filters.projectIds.length > 0) {
      where.salesTransaction = {
        ...where.salesTransaction,
        projectId: { in: filters.projectIds },
      }
    }

    // Fetch matching calculations
    const calculations = await prisma.commissionCalculation.findMany({
      where,
      include: {
        salesTransaction: {
          select: {
            id: true,
            amount: true,
            transactionDate: true,
            invoiceNumber: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        commissionPlan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        calculatedAt: 'desc',
      },
    })

    // Count by status
    const statusCounts = calculations.reduce((acc, calc) => {
      acc[calc.status] = (acc[calc.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Map to preview format
    const previews: CalculationPreview[] = calculations.map((calc) => ({
      id: calc.id,
      amount: calc.amount,
      status: calc.status,
      calculatedAt: calc.calculatedAt,
      salesTransaction: {
        id: calc.salesTransaction.id,
        amount: calc.salesTransaction.amount,
        transactionDate: calc.salesTransaction.transactionDate,
        invoiceNumber: calc.salesTransaction.invoiceNumber,
      },
      user: calc.user,
      commissionPlan: calc.commissionPlan,
      project: calc.salesTransaction.project,
    }))

    return {
      success: true,
      data: {
        calculations: previews,
        total: calculations.length,
        statusCounts,
      },
    }
  } catch (error) {
    console.error('Error finding calculations for recalculation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find calculations',
    }
  }
}

/**
 * Bulk recalculate commissions based on filters
 * Enhanced version that accepts filters instead of just IDs
 */
export async function bulkRecalculateCommissions(filters: RecalculationFilters) {
  try {
    const organizationId = await getOrganizationId()

    // First find all matching calculations
    const findResult = await findCalculationsForRecalculation(filters)

    if (!findResult.success || !findResult.data) {
      throw new Error(findResult.error || 'Failed to find calculations')
    }

    const calculationIds = findResult.data.calculations.map((calc) => calc.id)

    if (calculationIds.length === 0) {
      return {
        success: true,
        message: 'No calculations found matching the filters',
        data: {
          recalculatedCount: 0,
          unchangedCount: 0,
          errors: [],
        },
      }
    }

    // Fetch calculations with all necessary data for recalculation
    const calculations = await prisma.commissionCalculation.findMany({
      where: {
        id: { in: calculationIds },
        organizationId,
        status: { in: ['PENDING', 'CALCULATED'] },
      },
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
        commissionPlan: {
          include: {
            rules: true,
          },
        },
        user: true,
      },
    })

    // Import calculator and net sales calculator
    const { calculateCommissionWithPrecedence } = await import('@/lib/commission-calculator')
    const { calculateNetSalesAmount } = await import('@/lib/net-sales-calculator')

    let recalculatedCount = 0
    let unchangedCount = 0
    const errors: string[] = []

    // Recalculate each commission
    for (const calc of calculations) {
      try {
        const { salesTransaction, commissionPlan } = calc

        // Calculate net sales amount
        const netAmount = await calculateNetSalesAmount(salesTransaction.id)

        // Build calculation context from transaction
        const context = {
          grossAmount: salesTransaction.amount,
          netAmount,
          transactionDate: salesTransaction.transactionDate,
          customerId: salesTransaction.project?.clientId,
          customerTier: salesTransaction.project?.client?.tier,
          projectId: salesTransaction.projectId || undefined,
          territoryId: salesTransaction.project?.client?.territoryId || undefined,
          commissionBasis: commissionPlan.commissionBasis,
        }

        // Recalculate with current rules
        const result = calculateCommissionWithPrecedence(
          context,
          commissionPlan.rules as any
        )

        // Update if amount changed
        if (result.finalAmount !== calc.amount) {
          // Mark metadata with recalculated flag
          const metadata = { ...(result as any), recalculated: true }

          await prisma.commissionCalculation.update({
            where: { id: calc.id },
            data: {
              amount: result.finalAmount,
              calculatedAt: new Date(),
              metadata,
            },
          })
          recalculatedCount++
        } else {
          unchangedCount++
        }
      } catch (error) {
        console.error(`Error recalculating commission ${calc.id}:`, error)
        errors.push(`Failed to recalculate commission for ${calc.user.firstName} ${calc.user.lastName}`)
      }
    }

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/admin/recalculate-commissions')

    return {
      success: true,
      message: `Recalculated ${recalculatedCount} commission(s). ${unchangedCount} unchanged.`,
      data: {
        recalculatedCount,
        unchangedCount,
        errors,
      },
    }
  } catch (error) {
    console.error('Error bulk recalculating commissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk recalculate commissions',
    }
  }
}

// ============================================
// MISSING COMMISSIONS DETECTION & CALCULATION
// ============================================

export interface MissingCommissionFilters {
  dateFrom?: Date
  dateTo?: Date
  userIds?: string[]
  projectIds?: string[]
}

export interface TransactionWithoutCalculation {
  id: string
  amount: number
  transactionDate: Date
  invoiceNumber: string | null
  transactionType: string
  user: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  project: {
    id: string
    name: string
  } | null
  reason: string
}

/**
 * Helper function to resolve commission plan for a transaction
 * Follows the hierarchy: project-specific -> org-wide
 */
async function resolveCommissionPlanForTransaction(
  projectId: string | null,
  organizationId: string
) {
  // Try project-specific plan first
  if (projectId) {
    const projectPlan = await prisma.commissionPlan.findFirst({
      where: {
        projectId,
        organizationId,
        isActive: true,
      },
      include: { rules: true },
    })

    if (projectPlan) {
      return projectPlan
    }
  }

  // Fall back to organization-wide plan
  const orgPlan = await prisma.commissionPlan.findFirst({
    where: {
      organizationId,
      projectId: null,
      isActive: true,
    },
    include: { rules: true },
  })

  return orgPlan
}

/**
 * Find sales transactions that don't have any commission calculations
 * Useful for backfilling commissions after importing data or creating new plans
 */
export async function findTransactionsWithoutCalculations(filters: MissingCommissionFilters = {}) {
  try {
    const organizationId = await getOrganizationId()

    // Build where clause for transactions
    const where: any = {
      organizationId,
      transactionType: 'SALE', // Only SALE transactions get commissions
    }

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      where.transactionDate = {}
      if (filters.dateFrom) {
        where.transactionDate.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.transactionDate.lte = filters.dateTo
      }
    }

    // Filter by salespeople
    if (filters.userIds && filters.userIds.length > 0) {
      where.userId = { in: filters.userIds }
    }

    // Filter by projects
    if (filters.projectIds && filters.projectIds.length > 0) {
      where.projectId = { in: filters.projectIds }
    }

    // Find all transactions matching filters
    const transactions = await prisma.salesTransaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        commissionCalculations: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    })

    // Filter to only those without calculations and determine reason
    const transactionsWithoutCalcs: TransactionWithoutCalculation[] = []

    for (const transaction of transactions) {
      if (transaction.commissionCalculations.length === 0) {
        // Determine why there's no calculation
        let reason = 'No commission plan found'

        // Try to resolve commission plan
        const plan = await resolveCommissionPlanForTransaction(
          transaction.projectId,
          organizationId
        )

        if (plan) {
          if (!plan.isActive) {
            reason = 'Commission plan is inactive'
          } else {
            reason = 'Missing calculation (plan exists)'
          }
        }

        transactionsWithoutCalcs.push({
          id: transaction.id,
          amount: transaction.amount,
          transactionDate: transaction.transactionDate,
          invoiceNumber: transaction.invoiceNumber,
          transactionType: transaction.transactionType,
          user: transaction.user,
          project: transaction.project,
          reason,
        })
      }
    }

    return {
      success: true,
      data: {
        transactions: transactionsWithoutCalcs,
        total: transactionsWithoutCalcs.length,
      },
    }
  } catch (error) {
    console.error('Error finding transactions without calculations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find transactions',
    }
  }
}

/**
 * Calculate missing commissions for transactions that don't have calculations
 * Similar to backfill script but as a server action
 */
export async function calculateMissingCommissions(transactionIds: string[]) {
  try {
    const organizationId = await getOrganizationId()

    if (transactionIds.length === 0) {
      throw new Error('No transactions selected for calculation')
    }

    // Fetch transactions with all necessary data
    const transactions = await prisma.salesTransaction.findMany({
      where: {
        id: { in: transactionIds },
        organizationId,
        transactionType: 'SALE',
      },
      include: {
        user: true,
        project: {
          include: {
            client: true,
          },
        },
        commissionCalculations: true,
      },
    })

    // Import required functions
    const { calculateCommissionWithPrecedence } = await import('@/lib/commission-calculator')
    const { calculateNetSalesAmount } = await import('@/lib/net-sales-calculator')

    let createdCount = 0
    let skippedCount = 0
    const errors: string[] = []
    const skipped: Array<{ transaction: string; reason: string }> = []

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Skip if already has calculations
        if (transaction.commissionCalculations.length > 0) {
          skippedCount++
          skipped.push({
            transaction: transaction.invoiceNumber || transaction.id,
            reason: 'Already has commission calculation',
          })
          continue
        }

        // Resolve commission plan
        const plan = await resolveCommissionPlanForTransaction(
          transaction.projectId,
          organizationId
        )

        if (!plan) {
          skippedCount++
          skipped.push({
            transaction: transaction.invoiceNumber || transaction.id,
            reason: 'No commission plan found',
          })
          continue
        }

        if (!plan.isActive) {
          skippedCount++
          skipped.push({
            transaction: transaction.invoiceNumber || transaction.id,
            reason: 'Commission plan is inactive',
          })
          continue
        }

        // Fetch rules for the plan
        const planWithRules = await prisma.commissionPlan.findUnique({
          where: { id: plan.id },
          include: { rules: true },
        })

        if (!planWithRules || planWithRules.rules.length === 0) {
          skippedCount++
          skipped.push({
            transaction: transaction.invoiceNumber || transaction.id,
            reason: 'Commission plan has no rules',
          })
          continue
        }

        // Calculate net sales amount
        const netAmount = await calculateNetSalesAmount(transaction.id)

        // Build calculation context
        const context = {
          grossAmount: transaction.amount,
          netAmount,
          transactionDate: transaction.transactionDate,
          customerId: transaction.project?.clientId,
          customerTier: transaction.project?.client?.tier,
          projectId: transaction.projectId || undefined,
          territoryId: transaction.project?.client?.territoryId || undefined,
          commissionBasis: planWithRules.commissionBasis,
        }

        // Calculate commission
        const result = calculateCommissionWithPrecedence(
          context,
          planWithRules.rules as any
        )

        // Create commission calculation
        await prisma.commissionCalculation.create({
          data: {
            organizationId,
            userId: transaction.userId,
            salesTransactionId: transaction.id,
            commissionPlanId: planWithRules.id,
            amount: result.finalAmount,
            status: 'PENDING',
            calculatedAt: new Date(),
            metadata: { ...(result as any), backfilled: true },
          },
        })

        createdCount++
      } catch (error) {
        console.error(`Error calculating commission for transaction ${transaction.id}:`, error)
        errors.push(
          `Failed to calculate commission for ${transaction.invoiceNumber || transaction.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
        skippedCount++
      }
    }

    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/admin/missing-commissions')

    return {
      success: true,
      message: `Created ${createdCount} commission calculation(s). ${skippedCount} skipped.`,
      data: {
        createdCount,
        skippedCount,
        skipped,
        errors,
      },
    }
  } catch (error) {
    console.error('Error calculating missing commissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate missing commissions',
    }
  }
}
