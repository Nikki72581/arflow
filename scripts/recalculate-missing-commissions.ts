/**
 * Script to recalculate commissions for sales transactions that don't have calculations
 * This is particularly useful for sales records created before the system supported
 * sales without client/project records, or for records that failed to calculate initially.
 *
 * Run with: npx tsx --env-file=.env.local scripts/recalculate-missing-commissions.ts
 */

import { prisma } from '@/lib/db'
import {
  calculateCommissionWithPrecedence,
  type CalculationContext,
  type ScopedCommissionRule,
} from '@/lib/commission-calculator'
import { calculateNetSalesAmount } from '@/lib/net-sales-calculator'

async function recalculateMissingCommissions() {
  try {
    console.log('🔍 Finding sales transactions without commission calculations...\n')

    // Find all sales transactions that don't have any commission calculations
    const salesWithoutCommissions = await prisma.salesTransaction.findMany({
      where: {
        commissionCalculations: {
          none: {},
        },
        // Only process SALE transactions (not RETURN or ADJUSTMENT)
        transactionType: 'SALE',
      },
      include: {
        project: {
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
        },
        client: {
          include: {
            territory: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        productCategory: true,
        organization: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    })

    if (salesWithoutCommissions.length === 0) {
      console.log('✅ All sales transactions already have commission calculations!')
      return
    }

    console.log(`📊 Found ${salesWithoutCommissions.length} sales transactions without commissions\n`)

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: Array<{ transactionId: string; error: string }> = []

    for (const transaction of salesWithoutCommissions) {
      try {
        // Get client from project or direct client relationship
        const client = transaction.project?.client || transaction.client

        // Determine which commission plan to use
        let commissionPlan = null
        const organizationId = transaction.organizationId

        if (transaction.project && transaction.project.commissionPlans.length > 0) {
          // Use project's first active plan
          commissionPlan = transaction.project.commissionPlans[0]
        } else if (client) {
          // Look for client-level plans
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
            commissionPlan = clientPlans[0]
          } else {
            // Fall back to organization-wide plans
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
              commissionPlan = orgPlans[0]
            }
          }
        } else {
          // No client - look for organization-wide plans
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
            commissionPlan = orgPlans[0]
          }
        }

        if (!commissionPlan || commissionPlan.rules.length === 0) {
          console.log(
            `⏭️  Skipped transaction ${transaction.id} (${transaction.transactionDate.toISOString().split('T')[0]}, $${transaction.amount}) - No commission plan available`
          )
          skippedCount++
          continue
        }

        // Calculate net sales amount
        const netAmount = await calculateNetSalesAmount(transaction.id)

        // Build calculation context
        const context: CalculationContext = {
          grossAmount: transaction.amount,
          netAmount,
          transactionDate: transaction.transactionDate,
          customerId: client?.id,
          customerTier: client?.tier,
          projectId: transaction.projectId || undefined,
          productCategoryId: transaction.productCategoryId || undefined,
          territoryId: client?.territoryId || undefined,
          commissionBasis: commissionPlan.commissionBasis,
        }

        // Calculate commission
        const result = calculateCommissionWithPrecedence(
          context,
          commissionPlan.rules as ScopedCommissionRule[]
        )

        // Build metadata for audit trail
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
            projectId: transaction.projectId,
          },
          selectedRule: result.selectedRule,
          matchedRules: result.matchedRules,
          appliedRules: result.appliedRules,
          calculatedAt: new Date().toISOString(),
          backfilled: true, // Mark as backfilled
        }

        // Create commission calculation
        await prisma.commissionCalculation.create({
          data: {
            salesTransactionId: transaction.id,
            userId: transaction.userId,
            commissionPlanId: commissionPlan.id,
            amount: result.finalAmount,
            metadata,
            calculatedAt: new Date(),
            status: 'PENDING',
            organizationId,
          },
        })

        console.log(
          `✅ Created commission for transaction ${transaction.id} (${transaction.transactionDate.toISOString().split('T')[0]}, $${transaction.amount}) - Commission: $${result.finalAmount.toFixed(2)} for ${transaction.user.firstName} ${transaction.user.lastName}`
        )
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error processing transaction ${transaction.id}:`, errorMessage)
        errors.push({ transactionId: transaction.id, error: errorMessage })
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📈 Summary:')
    console.log(`   ✅ Successfully created: ${successCount} commissions`)
    console.log(`   ⏭️  Skipped (no plan):   ${skippedCount} transactions`)
    console.log(`   ❌ Errors:              ${errorCount} transactions`)
    console.log('='.repeat(80))

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      errors.forEach(({ transactionId, error }) => {
        console.log(`   - Transaction ${transactionId}: ${error}`)
      })
    }

    console.log('\n✨ Done!')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
recalculateMissingCommissions()
