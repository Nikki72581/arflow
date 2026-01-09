'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  calculateCommission,
  calculateCommissionWithPrecedence,
  type CalculationContext,
  type ScopedCommissionRule,
} from '@/lib/commission-calculator'
import { calculateNetSalesAmount } from '@/lib/net-sales-calculator'
import {
  createSalesTransactionSchema,
  updateSalesTransactionSchema,
} from '@/lib/validations/sales-transaction'
import type {
  CreateSalesTransactionInput,
  UpdateSalesTransactionInput,
} from '@/lib/validations/sales-transaction'

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
// SALES TRANSACTION ACTIONS
// ============================================

/**
 * Create a new sales transaction and calculate commission
 */
export async function createSalesTransaction(data: CreateSalesTransactionInput) {
  try {
    const organizationId = await getOrganizationId()

    // Validate input
    const validatedData = createSalesTransactionSchema.parse(data)

    // Get organization settings to check if projects are required
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { requireProjects: true },
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Enforce project requirement if enabled
    if (organization.requireProjects && !validatedData.projectId) {
      throw new Error('Project is required for sales transactions in this organization')
    }

    // Verify project belongs to organization (if project is provided)
    let project = null
    let client = null

    if (validatedData.projectId) {
      project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          organizationId,
        },
        include: {
          client: {
            include: {
              territory: true,
            },
          },
          commissionPlans: {
            where: { isActive: true },
            include: { rules: true },
          },
        },
      })

      if (!project) {
        throw new Error('Project not found')
      }
      client = project.client
    } else if (validatedData.clientId) {
      // If no project but client is provided, fetch client directly
      client = await prisma.client.findFirst({
        where: {
          id: validatedData.clientId,
          organizationId,
        },
        include: {
          territory: true,
        },
      })

      if (!client) {
        throw new Error('Client not found')
      }
    }

    // Verify user belongs to organization
    const user = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('Salesperson not found')
    }

    // Determine which commission plan to use
    let commissionPlanId = validatedData.commissionPlanId

    if (!commissionPlanId) {
      if (project && project.commissionPlans.length > 0) {
        // Use project's first active plan if no specific plan provided
        commissionPlanId = project.commissionPlans[0].id
      } else if (client) {
        // Look for client-level plans (plans associated with client's projects)
        const clientPlans = await prisma.commissionPlan.findMany({
          where: {
            organizationId,
            isActive: true,
            project: {
              clientId: client.id,
            },
          },
          include: { rules: true },
          take: 1,
        })

        if (clientPlans.length > 0) {
          commissionPlanId = clientPlans[0].id
        } else {
          // Fall back to organization-wide plans (plans with no project)
          const orgPlans = await prisma.commissionPlan.findMany({
            where: {
              organizationId,
              isActive: true,
              projectId: null,
            },
            include: { rules: true },
            take: 1,
          })

          if (orgPlans.length > 0) {
            commissionPlanId = orgPlans[0].id
          }
        }
      }
    }

    // Verify commission plan if provided
    let commissionPlan = null
    if (commissionPlanId) {
      commissionPlan = await prisma.commissionPlan.findFirst({
        where: {
          id: commissionPlanId,
          organizationId,
          isActive: true,
        },
        include: { rules: true },
      })

      if (!commissionPlan) {
        throw new Error('Commission plan not found or inactive')
      }
    }

    // Convert date string to Date object
    const transactionDate = new Date(validatedData.transactionDate)

    // Create transaction
    const transaction = await prisma.salesTransaction.create({
      data: {
        amount: validatedData.amount,
        transactionDate,
        transactionType: validatedData.transactionType || 'SALE',
        parentTransactionId: validatedData.parentTransactionId,
        productCategoryId: validatedData.productCategoryId,
        invoiceNumber: validatedData.invoiceNumber,
        description: validatedData.description,
        projectId: validatedData.projectId,
        clientId: validatedData.clientId, // Add clientId
        userId: validatedData.userId,
        organizationId,
      },
      include: {
        project: {
          include: {
            client: {
              include: { territory: true }
            }
          },
        },
        client: true, // Include direct client reference
        user: true,
        productCategory: true,
      },
    })

    // Calculate commission if plan exists
    let calculation = null
    if (commissionPlan && commissionPlan.rules.length > 0) {
      // Calculate net sales amount
      const netAmount = await calculateNetSalesAmount(transaction.id)

      // Build calculation context
      // Note: Client info is optional - sales without clients can still earn commissions
      const context: CalculationContext = {
        grossAmount: validatedData.amount,
        netAmount,
        transactionDate,
        customerId: client?.id,
        customerTier: client?.tier,
        projectId: validatedData.projectId || undefined,
        productCategoryId: validatedData.productCategoryId,
        territoryId: client?.territoryId || undefined,
        commissionBasis: commissionPlan.commissionBasis,
      }

      // Use precedence-aware calculator
      const result = calculateCommissionWithPrecedence(
        context,
        commissionPlan.rules as ScopedCommissionRule[]
      )

      // Build metadata for audit trail
      const metadata = {
        basis: result.basis,
        basisAmount: result.basisAmount,
        grossAmount: validatedData.amount,
        netAmount,
        context: {
          customerTier: client?.tier,
          customerId: client?.id,
          customerName: client?.name,
          productCategoryId: validatedData.productCategoryId,
          territoryId: client?.territoryId,
          territoryName: client?.territory?.name,
          projectId: validatedData.projectId,
        },
        selectedRule: result.selectedRule,
        matchedRules: result.matchedRules,
        appliedRules: result.appliedRules,
        calculatedAt: new Date().toISOString(),
      }

      calculation = await prisma.commissionCalculation.create({
        data: {
          salesTransactionId: transaction.id,
          userId: validatedData.userId,
          commissionPlanId: commissionPlan.id,
          amount: result.finalAmount,
          metadata,
          calculatedAt: new Date(),
          status: 'PENDING',
          organizationId,
        },
      })
    }

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/commissions')
    if (validatedData.projectId) {
      revalidatePath(`/dashboard/projects/${validatedData.projectId}`)
    }

    return {
      success: true,
      data: {
        transaction,
        calculation,
      },
    }
  } catch (error) {
    console.error('Error creating sales transaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sales transaction',
    }
  }
}

/**
 * Get all sales transactions for the organization
 */
export async function getSalesTransactions() {
  try {
    const organizationId = await getOrganizationId()

    const transactions = await prisma.salesTransaction.findMany({
      where: {
        organizationId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        client: true, // Include direct client reference for transactions without projects
        user: true,
        productCategory: true,
        commissionCalculations: {
          include: {
            commissionPlan: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    })

    return {
      success: true,
      data: transactions,
    }
  } catch (error) {
    console.error('Error fetching sales transactions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sales transactions',
    }
  }
}

/**
 * Get a single sales transaction by ID
 */
export async function getSalesTransaction(transactionId: string) {
  try {
    const organizationId = await getOrganizationId()

    const transaction = await prisma.salesTransaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        user: true,
        commissionCalculations: {
          include: {
            commissionPlan: {
              include: {
                rules: true,
              },
            },
          },
        },
      },
    })

    if (!transaction) {
      throw new Error('Sales transaction not found')
    }

    return {
      success: true,
      data: transaction,
    }
  } catch (error) {
    console.error('Error fetching sales transaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sales transaction',
    }
  }
}

/**
 * Update a sales transaction
 */
export async function updateSalesTransaction(
  transactionId: string,
  data: UpdateSalesTransactionInput
) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = updateSalesTransactionSchema.parse(data)

    // Verify transaction belongs to organization and get existing calculations
    const existingTransaction = await prisma.salesTransaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
      include: {
        commissionCalculations: {
          include: {
            commissionPlan: {
              include: {
                rules: true,
              },
            },
          },
        },
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    if (!existingTransaction) {
      throw new Error('Sales transaction not found')
    }

    // Track if we need to recalculate commissions
    const needsRecalculation =
      (validatedData.amount !== undefined && validatedData.amount !== existingTransaction.amount) ||
      (validatedData.transactionDate !== undefined && validatedData.transactionDate !== existingTransaction.transactionDate.toISOString().split('T')[0]) ||
      (validatedData.projectId !== undefined && validatedData.projectId !== existingTransaction.projectId)

    // If updating project, verify it belongs to organization
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          organizationId,
        },
      })

      if (!project) {
        throw new Error('Project not found')
      }
    }

    // If updating user, verify they belong to organization
    if (validatedData.userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: validatedData.userId,
          organizationId,
        },
      })

      if (!user) {
        throw new Error('Salesperson not found')
      }
    }

    // Convert date string if provided
    const updateData: any = { ...validatedData }
    if (validatedData.transactionDate) {
      updateData.transactionDate = new Date(validatedData.transactionDate)
    }

    // Update transaction
    const transaction = await prisma.salesTransaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        project: {
          include: { client: true },
        },
        client: true,
        user: true,
        commissionCalculations: {
          include: {
            commissionPlan: {
              include: {
                rules: true,
              },
            },
          },
        },
      },
    })

    // Auto-recalculate commissions if needed
    let recalculationResults = null
    if (needsRecalculation && existingTransaction.commissionCalculations.length > 0) {
      const { calculateCommissionWithPrecedence } = await import('@/lib/commission-calculator')
      const { calculateNetSalesAmount } = await import('@/lib/net-sales-calculator')

      // Check if any calculations are APPROVED or PAID
      const hasApprovedOrPaid = existingTransaction.commissionCalculations.some(
        (calc) => calc.status === 'APPROVED' || calc.status === 'PAID'
      )

      if (hasApprovedOrPaid) {
        // Don't recalculate, but include a warning in the response
        recalculationResults = {
          warning: 'Transaction has approved or paid commissions that were not recalculated. Consider reviewing these manually.',
          skippedCount: existingTransaction.commissionCalculations.filter(
            (calc) => calc.status === 'APPROVED' || calc.status === 'PAID'
          ).length,
        }
      }

      // Recalculate PENDING and CALCULATED commissions
      const recalculableCalcs = existingTransaction.commissionCalculations.filter(
        (calc) => calc.status === 'PENDING' || calc.status === 'CALCULATED'
      )

      if (recalculableCalcs.length > 0) {
        let recalculatedCount = 0
        const errors: string[] = []

        for (const calc of recalculableCalcs) {
          try {
            // Calculate net sales amount
            const netAmount = await calculateNetSalesAmount(transaction.id)

            // Build calculation context from updated transaction
            const context = {
              grossAmount: transaction.amount,
              netAmount,
              transactionDate: transaction.transactionDate,
              customerId: transaction.project?.clientId,
              customerTier: transaction.project?.client?.tier,
              projectId: transaction.projectId || undefined,
              territoryId: transaction.project?.client?.territoryId || undefined,
              commissionBasis: calc.commissionPlan.commissionBasis,
            }

            // Recalculate with current rules
            const result = calculateCommissionWithPrecedence(
              context,
              calc.commissionPlan.rules as any
            )

            // Update calculation with new amount
            await prisma.commissionCalculation.update({
              where: { id: calc.id },
              data: {
                amount: result.finalAmount,
                calculatedAt: new Date(),
                metadata: { ...(result as any), autoRecalculated: true },
              },
            })

            recalculatedCount++
          } catch (error) {
            console.error(`Error recalculating commission ${calc.id}:`, error)
            errors.push(`Failed to recalculate commission ${calc.id}`)
          }
        }

        recalculationResults = {
          ...recalculationResults,
          recalculatedCount,
          errors: errors.length > 0 ? errors : undefined,
        }
      }
    }

    revalidatePath('/dashboard/sales')
    revalidatePath(`/dashboard/sales/${transactionId}`)
    revalidatePath('/dashboard/commissions')

    return {
      success: true,
      data: transaction,
      recalculation: recalculationResults,
    }
  } catch (error) {
    console.error('Error updating sales transaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sales transaction',
    }
  }
}

/**
 * Delete a sales transaction
 */
export async function deleteSalesTransaction(transactionId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify transaction belongs to organization
    const existingTransaction = await prisma.salesTransaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
      include: {
        commissionCalculations: true,
      },
    })

    if (!existingTransaction) {
      throw new Error('Sales transaction not found')
    }

    // Check if any calculations are already paid
    const hasPaidCalculations = existingTransaction.commissionCalculations.some(
      (calc) => calc.status === 'PAID'
    )

    if (hasPaidCalculations) {
      throw new Error('Cannot delete transaction with paid commissions')
    }

    // Delete transaction (will cascade delete calculations)
    await prisma.salesTransaction.delete({
      where: { id: transactionId },
    })

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/commissions')
    
    return {
      success: true,
      message: 'Sales transaction deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting sales transaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete sales transaction',
    }
  }
}

/**
 * Recalculate commission for a transaction
 */
export async function recalculateCommission(transactionId: string, planId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Get transaction with full context
    const transaction = await prisma.salesTransaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
      include: {
        project: {
          include: {
            client: {
              include: {
                territory: true,
              },
            },
          },
        },
        client: {
          include: {
            territory: true,
          },
        },
        productCategory: true,
      },
    })

    if (!transaction) {
      throw new Error('Sales transaction not found')
    }

    // Get commission plan with rules
    const plan = await prisma.commissionPlan.findFirst({
      where: {
        id: planId,
        organizationId,
      },
      include: {
        rules: true,
      },
    })

    if (!plan) {
      throw new Error('Commission plan not found')
    }

    // Get client from project or direct client relationship
    const client = transaction.project?.client || transaction.client

    // Calculate net sales amount
    const netAmount = await calculateNetSalesAmount(transaction.id)

    // Build calculation context
    // Note: Client info is optional - sales without clients can still earn commissions
    const context: CalculationContext = {
      grossAmount: transaction.amount,
      netAmount,
      transactionDate: transaction.transactionDate,
      customerId: client?.id,
      customerTier: client?.tier,
      projectId: transaction.projectId || undefined,
      productCategoryId: transaction.productCategoryId || undefined,
      territoryId: client?.territoryId || undefined,
      commissionBasis: plan.commissionBasis,
    }

    // Use precedence-aware calculator
    const result = calculateCommissionWithPrecedence(
      context,
      plan.rules as ScopedCommissionRule[]
    )

    // Build metadata
    const metadata = {
      basis: result.basis,
      basisAmount: result.basisAmount,
      grossAmount: transaction.amount,
      netAmount,
      context: {
        customerTier: client?.tier,
        customerId: client?.id,
        customerName: client?.name,
        productCategoryId: transaction.productCategoryId,
        territoryId: client?.territoryId,
        territoryName: client?.territory?.name,
      },
      selectedRule: result.selectedRule,
      matchedRules: result.matchedRules,
      appliedRules: result.appliedRules,
      calculatedAt: new Date().toISOString(),
      recalculated: true,
    }

    // Delete existing calculations for this transaction that aren't paid
    await prisma.commissionCalculation.deleteMany({
      where: {
        salesTransactionId: transactionId,
        status: { not: 'PAID' },
      },
    })

    // Create new calculation
    const calculation = await prisma.commissionCalculation.create({
      data: {
        salesTransactionId: transaction.id,
        userId: transaction.userId,
        commissionPlanId: plan.id,
        amount: result.finalAmount,
        metadata,
        calculatedAt: new Date(),
        status: 'PENDING',
        organizationId,
      },
      include: {
        commissionPlan: true,
      },
    })

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/commissions')
    revalidatePath(`/dashboard/sales/${transactionId}`)

    return {
      success: true,
      data: calculation,
    }
  } catch (error) {
    console.error('Error recalculating commission:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recalculate commission',
    }
  }
}

/**
 * Get sales statistics
 */
export async function getSalesStats() {
  try {
    const organizationId = await getOrganizationId()

    const [totalSales, totalAmount, thisMonthSales, thisMonthAmount] = await Promise.all([
      // Total sales count
      prisma.salesTransaction.count({
        where: { organizationId },
      }),
      // Total sales amount
      prisma.salesTransaction.aggregate({
        where: { organizationId },
        _sum: { amount: true },
      }),
      // This month sales count
      prisma.salesTransaction.count({
        where: {
          organizationId,
          transactionDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // This month sales amount
      prisma.salesTransaction.aggregate({
        where: {
          organizationId,
          transactionDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ])

    return {
      success: true,
      data: {
        totalSales,
        totalAmount: totalAmount._sum.amount || 0,
        thisMonthSales,
        thisMonthAmount: thisMonthAmount._sum.amount || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching sales stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    }
  }
}
