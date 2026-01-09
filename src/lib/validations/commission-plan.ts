import { z } from 'zod'

/**
 * Schema for creating a commission plan
 */
export const createCommissionPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  projectId: z.string().optional(),
  commissionBasis: z.enum(['GROSS_REVENUE', 'NET_SALES']).default('GROSS_REVENUE'),
  isActive: z.boolean().default(true),
})

/**
 * Schema for updating a commission plan
 */
export const updateCommissionPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  commissionBasis: z.enum(['GROSS_REVENUE', 'NET_SALES']).optional(),
  isActive: z.boolean().optional(),
})

/**
 * Schema for creating a commission rule
 */
export const createCommissionRuleSchema = z
  .object({
    commissionPlanId: z.string().min(1, 'Plan ID is required'),
    ruleType: z.enum(['PERCENTAGE', 'FLAT_AMOUNT'] as const, {
      message: 'Rule type is required',
    }),
    // For PERCENTAGE type
    percentage: z.number().min(0).max(100).optional(),
    // For FLAT_AMOUNT type
    flatAmount: z.number().min(0).optional(),
    // NEW: Sale amount range filters (optional, work with any rule type)
    minSaleAmount: z.number().min(0).optional(),
    maxSaleAmount: z.number().min(0).optional(),
    // Optional commission caps (different from sale amount filters!)
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    description: z.string().optional(),
    // Scope and priority
    scope: z
      .enum(['GLOBAL', 'CUSTOMER_TIER', 'PRODUCT_CATEGORY', 'TERRITORY', 'CUSTOMER_SPECIFIC'])
      .default('GLOBAL'),
    priority: z
      .enum(['PROJECT_SPECIFIC', 'CUSTOMER_SPECIFIC', 'PRODUCT_CATEGORY', 'TERRITORY', 'CUSTOMER_TIER', 'DEFAULT'])
      .optional(),
    // Scope filters
    customerTier: z.enum(['STANDARD', 'VIP', 'NEW', 'ENTERPRISE']).optional(),
    productCategoryId: z.string().optional(),
    territoryId: z.string().optional(),
    clientId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate based on rule type
      if (data.ruleType === 'PERCENTAGE') {
        return data.percentage !== undefined && data.percentage > 0
      }
      if (data.ruleType === 'FLAT_AMOUNT') {
        return data.flatAmount !== undefined && data.flatAmount > 0
      }
      return true
    },
    {
      message: 'Invalid rule configuration for the selected type',
    }
  )
  .refine(
    (data) => {
      // Validate that maxAmount > minAmount if both are set (commission caps)
      if (data.minAmount !== undefined && data.maxAmount !== undefined) {
        return data.maxAmount > data.minAmount
      }
      return true
    },
    {
      message: 'Maximum commission must be greater than minimum commission',
      path: ['maxAmount'],
    }
  )
  .refine(
    (data) => {
      // NEW: Validate that maxSaleAmount > minSaleAmount if both are set
      if (data.minSaleAmount !== undefined && data.maxSaleAmount !== undefined) {
        return data.maxSaleAmount > data.minSaleAmount
      }
      return true
    },
    {
      message: 'Maximum sale amount must be greater than minimum sale amount',
      path: ['maxSaleAmount'],
    }
  )

/**
 * Schema for updating a commission rule
 */
export const updateCommissionRuleSchema = z
  .object({
    ruleType: z.enum(['PERCENTAGE', 'FLAT_AMOUNT'] as const).optional(),
    percentage: z.number().min(0).max(100).optional(),
    flatAmount: z.number().min(0).optional(),
    // NEW: Sale amount range filters
    minSaleAmount: z.number().min(0).optional(),
    maxSaleAmount: z.number().min(0).optional(),
    // Commission caps
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
    description: z.string().optional(),
    // Scope and priority
    scope: z
      .enum(['GLOBAL', 'CUSTOMER_TIER', 'PRODUCT_CATEGORY', 'TERRITORY', 'CUSTOMER_SPECIFIC'])
      .optional(),
    priority: z
      .enum(['PROJECT_SPECIFIC', 'CUSTOMER_SPECIFIC', 'PRODUCT_CATEGORY', 'TERRITORY', 'CUSTOMER_TIER', 'DEFAULT'])
      .optional(),
    // Scope filters
    customerTier: z.enum(['STANDARD', 'VIP', 'NEW', 'ENTERPRISE']).optional(),
    productCategoryId: z.string().optional(),
    territoryId: z.string().optional(),
    clientId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate that maxAmount > minAmount if both are set (commission caps)
      if (data.minAmount !== undefined && data.maxAmount !== undefined) {
        return data.maxAmount > data.minAmount
      }
      return true
    },
    {
      message: 'Maximum commission must be greater than minimum commission',
      path: ['maxAmount'],
    }
  )
  .refine(
    (data) => {
      // NEW: Validate that maxSaleAmount > minSaleAmount if both are set
      if (data.minSaleAmount !== undefined && data.maxSaleAmount !== undefined) {
        return data.maxSaleAmount > data.minSaleAmount
      }
      return true
    },
    {
      message: 'Maximum sale amount must be greater than minimum sale amount',
      path: ['maxSaleAmount'],
    }
  )

/**
 * Types inferred from schemas
 */
export type CreateCommissionPlanInput = z.infer<typeof createCommissionPlanSchema>
export type UpdateCommissionPlanInput = z.infer<typeof updateCommissionPlanSchema>
export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>
export type UpdateCommissionRuleInput = z.infer<typeof updateCommissionRuleSchema>
