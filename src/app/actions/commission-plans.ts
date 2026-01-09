'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  createCommissionPlanSchema,
  updateCommissionPlanSchema,
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
} from '@/lib/validations/commission-plan'
import type {
  CreateCommissionPlanInput,
  UpdateCommissionPlanInput,
  CreateCommissionRuleInput,
  UpdateCommissionRuleInput,
} from '@/lib/validations/commission-plan'
import {
  validateScopedRule,
  assignPriorityFromScope,
  detectRuleConflicts,
} from '@/lib/rule-precedence-validator'

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
// COMMISSION PLAN ACTIONS
// ============================================

/**
 * Create a new commission plan
 */
export async function createCommissionPlan(data: CreateCommissionPlanInput) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = createCommissionPlanSchema.parse(data)

    // If projectId is provided, verify it belongs to organization
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

    // Create plan
    const plan = await prisma.commissionPlan.create({
      data: {
        ...validatedData,
        organizationId,
      },
      include: {
        project: true,
        rules: true,
      },
    })

    revalidatePath('/dashboard/plans')
    if (validatedData.projectId) {
      revalidatePath(`/dashboard/projects/${validatedData.projectId}`)
    }
    
    return {
      success: true,
      data: plan,
    }
  } catch (error) {
    console.error('Error creating commission plan:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create commission plan',
    }
  }
}

/**
 * Get all commission plans for the organization
 */
export async function getCommissionPlans() {
  try {
    const organizationId = await getOrganizationId()

    const plans = await prisma.commissionPlan.findMany({
      where: {
        organizationId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        rules: true,
        _count: {
          select: {
            commissionCalculations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: plans,
    }
  } catch (error) {
    console.error('Error fetching commission plans:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch commission plans',
    }
  }
}

/**
 * Get a single commission plan by ID
 */
export async function getCommissionPlan(planId: string) {
  try {
    const organizationId = await getOrganizationId()

    const plan = await prisma.commissionPlan.findFirst({
      where: {
        id: planId,
        organizationId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        rules: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        commissionCalculations: {
          include: {
            salesTransaction: true,
            user: true,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!plan) {
      throw new Error('Commission plan not found')
    }

    return {
      success: true,
      data: plan,
    }
  } catch (error) {
    console.error('Error fetching commission plan:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch commission plan',
    }
  }
}

/**
 * Update a commission plan
 */
export async function updateCommissionPlan(
  planId: string,
  data: UpdateCommissionPlanInput
) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = updateCommissionPlanSchema.parse(data)

    // Verify plan belongs to organization
    const existingPlan = await prisma.commissionPlan.findFirst({
      where: {
        id: planId,
        organizationId,
      },
    })

    if (!existingPlan) {
      throw new Error('Commission plan not found')
    }

    // If updating projectId, verify new project belongs to organization
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

    // Update plan
    const plan = await prisma.commissionPlan.update({
      where: { id: planId },
      data: validatedData,
      include: {
        project: true,
        rules: true,
      },
    })

    revalidatePath('/dashboard/plans')
    revalidatePath(`/dashboard/plans/${planId}`)
    if (plan.projectId) {
      revalidatePath(`/dashboard/projects/${plan.projectId}`)
    }
    
    return {
      success: true,
      data: plan,
    }
  } catch (error) {
    console.error('Error updating commission plan:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update commission plan',
    }
  }
}

/**
 * Delete a commission plan
 */
export async function deleteCommissionPlan(planId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify plan belongs to organization
    const existingPlan = await prisma.commissionPlan.findFirst({
      where: {
        id: planId,
        organizationId,
      },
      include: {
        commissionCalculations: true,
      },
    })

    if (!existingPlan) {
      throw new Error('Commission plan not found')
    }

    // Check if plan has calculations
    if (existingPlan.commissionCalculations.length > 0) {
      throw new Error('Cannot delete plan with existing commission calculations')
    }

    // Delete plan (will cascade delete rules)
    await prisma.commissionPlan.delete({
      where: { id: planId },
    })

    revalidatePath('/dashboard/plans')
    if (existingPlan.projectId) {
      revalidatePath(`/dashboard/projects/${existingPlan.projectId}`)
    }
    
    return {
      success: true,
      message: 'Commission plan deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting commission plan:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete commission plan',
    }
  }
}

// ============================================
// COMMISSION RULE ACTIONS
// ============================================

/**
 * Create a new commission rule
 */
export async function createCommissionRule(data: CreateCommissionRuleInput) {
  try {
    const organizationId = await getOrganizationId()

    // Validate input
    const validatedData = createCommissionRuleSchema.parse(data)

    // Verify plan belongs to organization
    const plan = await prisma.commissionPlan.findFirst({
      where: {
        id: validatedData.commissionPlanId,
        organizationId,
      },
      include: {
        rules: {
          select: {
            id: true,
            scope: true,
            priority: true,
            customerTier: true,
            productCategoryId: true,
            territoryId: true,
            clientId: true,
            description: true,
          },
        },
      },
    })

    if (!plan) {
      throw new Error('Commission plan not found')
    }

    // Validate scoped rule configuration
    const scopeValidation = validateScopedRule({
      scope: validatedData.scope || 'GLOBAL',
      customerTier: validatedData.customerTier,
      productCategoryId: validatedData.productCategoryId,
      territoryId: validatedData.territoryId,
      clientId: validatedData.clientId,
    })

    if (!scopeValidation.valid) {
      const errorMessages = scopeValidation.errors.map((e) => e.message).join(', ')
      throw new Error(`Invalid rule configuration: ${errorMessages}`)
    }

    // Auto-assign priority if not set
    const priority =
      validatedData.priority || assignPriorityFromScope(validatedData.scope || 'GLOBAL')

    // Detect potential conflicts with existing rules
    const conflicts = detectRuleConflicts(
      {
        scope: validatedData.scope || 'GLOBAL',
        customerTier: validatedData.customerTier,
        productCategoryId: validatedData.productCategoryId,
        territoryId: validatedData.territoryId,
        clientId: validatedData.clientId,
      },
      plan.rules.map((r) => ({ ...r, name: r.description || undefined }))
    )

    // Create rule with auto-assigned priority
    const rule = await prisma.commissionRule.create({
      data: {
        ...validatedData,
        priority,
      },
    })

    revalidatePath('/dashboard/plans')
    revalidatePath(`/dashboard/plans/${validatedData.commissionPlanId}`)

    // Return with warnings if conflicts detected
    return {
      success: true,
      data: rule,
      warnings: conflicts.length > 0 ? conflicts.map((c) => c.reason) : undefined,
    }
  } catch (error) {
    console.error('Error creating commission rule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create commission rule',
    }
  }
}

/**
 * Update a commission rule
 */
export async function updateCommissionRule(
  ruleId: string,
  data: UpdateCommissionRuleInput
) {
  try {
    const organizationId = await getOrganizationId()

    // Validate input
    const validatedData = updateCommissionRuleSchema.parse(data)

    // Verify rule belongs to a plan in this organization
    const existingRule = await prisma.commissionRule.findFirst({
      where: {
        id: ruleId,
        commissionPlan: {
          organizationId,
        },
      },
      include: {
        commissionPlan: {
          include: {
            rules: {
              where: {
                id: {
                  not: ruleId, // Exclude current rule from conflict check
                },
              },
              select: {
                id: true,
                scope: true,
                priority: true,
                customerTier: true,
                productCategoryId: true,
                territoryId: true,
                clientId: true,
                description: true,
              },
            },
          },
        },
      },
    })

    if (!existingRule) {
      throw new Error('Commission rule not found')
    }

    // If scope fields are being updated, validate
    if (
      validatedData.scope !== undefined ||
      validatedData.customerTier !== undefined ||
      validatedData.productCategoryId !== undefined ||
      validatedData.territoryId !== undefined ||
      validatedData.clientId !== undefined
    ) {
      const scopeValidation = validateScopedRule({
        scope: validatedData.scope ?? existingRule.scope,
        customerTier: validatedData.customerTier ?? existingRule.customerTier,
        productCategoryId: validatedData.productCategoryId ?? existingRule.productCategoryId,
        territoryId: validatedData.territoryId ?? existingRule.territoryId,
        clientId: validatedData.clientId ?? existingRule.clientId,
      })

      if (!scopeValidation.valid) {
        const errorMessages = scopeValidation.errors.map((e) => e.message).join(', ')
        throw new Error(`Invalid rule configuration: ${errorMessages}`)
      }

      // Auto-reassign priority if scope changed and priority not explicitly set
      if (validatedData.scope && !validatedData.priority) {
        validatedData.priority = assignPriorityFromScope(validatedData.scope)
      }

      // Detect conflicts
      const conflicts = detectRuleConflicts(
        {
          scope: validatedData.scope ?? existingRule.scope,
          customerTier: validatedData.customerTier ?? existingRule.customerTier,
          productCategoryId: validatedData.productCategoryId ?? existingRule.productCategoryId,
          territoryId: validatedData.territoryId ?? existingRule.territoryId,
          clientId: validatedData.clientId ?? existingRule.clientId,
        },
        existingRule.commissionPlan.rules.map((r) => ({ ...r, name: r.description || undefined }))
      )

      // Update rule
      const rule = await prisma.commissionRule.update({
        where: { id: ruleId },
        data: validatedData,
      })

      revalidatePath('/dashboard/plans')
      revalidatePath(`/dashboard/plans/${existingRule.commissionPlanId}`)

      return {
        success: true,
        data: rule,
        warnings: conflicts.length > 0 ? conflicts.map((c) => c.reason) : undefined,
      }
    }

    // No scope changes - simple update
    const rule = await prisma.commissionRule.update({
      where: { id: ruleId },
      data: validatedData,
    })

    revalidatePath('/dashboard/plans')
    revalidatePath(`/dashboard/plans/${existingRule.commissionPlanId}`)

    return {
      success: true,
      data: rule,
    }
  } catch (error) {
    console.error('Error updating commission rule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update commission rule',
    }
  }
}

/**
 * Delete a commission rule
 */
export async function deleteCommissionRule(ruleId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify rule belongs to a plan in this organization
    const existingRule = await prisma.commissionRule.findFirst({
      where: {
        id: ruleId,
        commissionPlan: {
          organizationId,
        },
      },
      include: {
        commissionPlan: true,
      },
    })

    if (!existingRule) {
      throw new Error('Commission rule not found')
    }

    // Delete rule
    await prisma.commissionRule.delete({
      where: { id: ruleId },
    })

    revalidatePath('/dashboard/plans')
    revalidatePath(`/dashboard/plans/${existingRule.commissionPlanId}`)
    
    return {
      success: true,
      message: 'Commission rule deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting commission rule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete commission rule',
    }
  }
}

/**
 * Get commission plan statistics
 */
export async function getCommissionPlanStats() {
  try {
    const organizationId = await getOrganizationId()

    const [totalPlans, activePlans, plansWithRules] = await Promise.all([
      prisma.commissionPlan.count({
        where: { organizationId },
      }),
      prisma.commissionPlan.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
      prisma.commissionPlan.count({
        where: {
          organizationId,
          rules: {
            some: {},
          },
        },
      }),
    ])

    return {
      success: true,
      data: {
        totalPlans,
        activePlans,
        inactivePlans: totalPlans - activePlans,
        plansWithRules,
        plansWithoutRules: totalPlans - plansWithRules,
      },
    }
  } catch (error) {
    console.error('Error fetching commission plan stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    }
  }
}
