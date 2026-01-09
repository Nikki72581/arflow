import type {
  CommissionRule,
  CommissionBasis,
  CustomerTier,
  RuleScope,
  RulePriority,
} from '@prisma/client'
import { compareRulePrecedence } from './rule-precedence-validator'

export interface CalculationResult {
  baseAmount: number
  cappedAmount: number
  appliedRules: {
    ruleId: string
    ruleType: string
    calculatedAmount: number
    description: string
  }[]
  finalAmount: number
}

export interface CalculationContext {
  // Transaction details
  grossAmount: number
  netAmount: number // After returns/credits
  transactionDate: Date

  // Contextual information
  customerId?: string
  customerTier?: CustomerTier
  projectId?: string
  productCategoryId?: string
  territoryId?: string

  // Basis selection
  commissionBasis: CommissionBasis
}

export interface EnhancedCalculationResult extends CalculationResult {
  basis: CommissionBasis
  basisAmount: number
  context: {
    customerTier?: CustomerTier
    productCategory?: string
    territory?: string
  }
}

export interface ScopedCommissionRule extends CommissionRule {
  scope: RuleScope
  priority: RulePriority
  customerTier: CustomerTier | null
  productCategoryId: string | null
  territoryId: string | null
  clientId: string | null
  minSaleAmount: number | null
  maxSaleAmount: number | null
}

export interface PrecedenceCalculationResult extends EnhancedCalculationResult {
  selectedRule?: {
    id: string
    scope: RuleScope
    priority: RulePriority
    description: string
  }
  matchedRules: Array<{
    id: string
    scope: RuleScope
    priority: RulePriority
    selected: boolean
  }>
}

/**
 * Calculate commission based on a set of rules
 */
export function calculateCommission(
  saleAmount: number,
  rules: CommissionRule[]
): CalculationResult {
  if (rules.length === 0) {
    return {
      baseAmount: 0,
      cappedAmount: 0,
      appliedRules: [],
      finalAmount: 0,
    }
  }

  let totalCommission = 0
  const appliedRules: CalculationResult['appliedRules'] = []

  // Apply each rule
  for (const rule of rules) {
    let ruleAmount = 0
    let description = ''

    switch (rule.ruleType) {
      case 'PERCENTAGE':
        if (rule.percentage) {
          ruleAmount = saleAmount * (rule.percentage / 100)
          description = `${rule.percentage}% of $${saleAmount.toFixed(2)}`
        }
        break

      case 'FLAT_AMOUNT':
        if (rule.flatAmount) {
          ruleAmount = rule.flatAmount
          description = `Flat amount of $${rule.flatAmount.toFixed(2)}`
        }
        break

      case 'TIERED':
        // DEPRECATED: TIERED rules have been migrated to PERCENTAGE rules with amount ranges
        console.warn(
          `Encountered deprecated TIERED rule (ID: ${rule.id}). This should have been migrated. Skipping calculation.`
        )
        description = '[DEPRECATED] Tiered rule - please migrate to amount-based rules'
        ruleAmount = 0
        break

      default:
        console.warn(`Unsupported rule type: ${rule.ruleType}. Rule ID: ${rule.id}`)
        break
    }

    // Apply min/max caps per rule if specified
    let cappedRuleAmount = ruleAmount

    if (rule.minAmount !== null && ruleAmount < rule.minAmount) {
      cappedRuleAmount = rule.minAmount
      description += ` (raised to minimum of $${rule.minAmount.toFixed(2)})`
    }

    if (rule.maxAmount !== null && ruleAmount > rule.maxAmount) {
      cappedRuleAmount = rule.maxAmount
      description += ` (capped at maximum of $${rule.maxAmount.toFixed(2)})`
    }

    appliedRules.push({
      ruleId: rule.id,
      ruleType: rule.ruleType,
      calculatedAmount: cappedRuleAmount,
      description,
    })

    totalCommission += cappedRuleAmount
  }

  return {
    baseAmount: appliedRules.reduce((sum, r) => sum + r.calculatedAmount, 0),
    cappedAmount: totalCommission,
    appliedRules,
    finalAmount: totalCommission,
  }
}

/**
 * Preview commission calculation for display
 */
export function previewCommission(
  saleAmount: number,
  rules: CommissionRule[]
): {
  saleAmount: number
  totalCommission: number
  rules: {
    type: string
    description: string
    amount: number
  }[]
} {
  const result = calculateCommission(saleAmount, rules)

  return {
    saleAmount,
    totalCommission: result.finalAmount,
    rules: result.appliedRules.map((r) => ({
      type: r.ruleType,
      description: r.description,
      amount: r.calculatedAmount,
    })),
  }
}

/**
 * Format rule for display
 */
export function formatRule(rule: CommissionRule): string {
  // Build amount range description first
  let rangeDesc = ''
  if (rule.minSaleAmount !== null || rule.maxSaleAmount !== null) {
    if (rule.minSaleAmount !== null && rule.maxSaleAmount !== null) {
      rangeDesc = ` (sales $${rule.minSaleAmount.toFixed(0)}-$${rule.maxSaleAmount.toFixed(0)})`
    } else if (rule.minSaleAmount !== null) {
      rangeDesc = ` (sales $${rule.minSaleAmount.toFixed(0)}+)`
    } else if (rule.maxSaleAmount !== null) {
      rangeDesc = ` (sales ≤$${rule.maxSaleAmount.toFixed(0)})`
    }
  }

  switch (rule.ruleType) {
    case 'PERCENTAGE':
      return `${rule.percentage}% of sale${rangeDesc}`

    case 'FLAT_AMOUNT':
      return `$${rule.flatAmount?.toFixed(2)} per sale${rangeDesc}`

    case 'TIERED':
      return '[DEPRECATED] Tiered rule - please migrate to amount-based rules'

    default:
      return 'Unknown rule type'
  }
}

/**
 * Get rule type display name
 */
export function getRuleTypeLabel(ruleType: string): string {
  switch (ruleType) {
    case 'PERCENTAGE':
      return 'Percentage'
    case 'FLAT_AMOUNT':
      return 'Flat Amount'
    case 'TIERED':
      return 'Tiered'
    default:
      return ruleType
  }
}

/**
 * Calculate commission with context (enhanced version)
 */
export function calculateCommissionWithContext(
  context: CalculationContext,
  rules: CommissionRule[]
): EnhancedCalculationResult {
  // Determine basis amount
  const basisAmount =
    context.commissionBasis === 'NET_SALES'
      ? context.netAmount
      : context.grossAmount

  // Use existing calculation logic
  const baseResult = calculateCommission(basisAmount, rules)

  // Return enhanced result
  return {
    ...baseResult,
    basis: context.commissionBasis,
    basisAmount,
    context: {
      customerTier: context.customerTier,
      productCategory: context.productCategoryId,
      territory: context.territoryId,
    },
  }
}

/**
 * Check if a scoped rule applies to the current transaction context
 */
export function ruleApplies(
  rule: ScopedCommissionRule,
  context: CalculationContext
): boolean {
  // FIRST: Check amount range filters (if set)
  const saleAmount =
    context.commissionBasis === 'NET_SALES'
      ? context.netAmount
      : context.grossAmount

  // If minSaleAmount is set, sale must be >= min
  if (rule.minSaleAmount !== null && saleAmount < rule.minSaleAmount) {
    return false
  }

  // If maxSaleAmount is set, sale must be <= max
  if (rule.maxSaleAmount !== null && saleAmount > rule.maxSaleAmount) {
    return false
  }

  // THEN: Check scope matching (existing logic)
  switch (rule.scope) {
    case 'GLOBAL':
      // Global rules always apply
      return true

    case 'CUSTOMER_TIER':
      // Must match customer tier
      return rule.customerTier === context.customerTier

    case 'PRODUCT_CATEGORY':
      // Must match product category
      return rule.productCategoryId === context.productCategoryId

    case 'TERRITORY':
      // Must match territory
      return rule.territoryId === context.territoryId

    case 'CUSTOMER_SPECIFIC':
      // Must match specific customer
      return rule.clientId === context.customerId

    default:
      return false
  }
}

/**
 * Filter and sort rules by applicability and precedence
 * Returns rules sorted by priority (highest first)
 */
export function getApplicableRules(
  rules: ScopedCommissionRule[],
  context: CalculationContext
): ScopedCommissionRule[] {
  // Filter to only applicable rules
  const applicable = rules.filter((rule) => ruleApplies(rule, context))

  // Sort by precedence (highest priority first, then newest first)
  return applicable.sort(compareRulePrecedence)
}

/**
 * Calculate commission with precedence hierarchy
 * Applies the highest-priority matching rule only
 */
export function calculateCommissionWithPrecedence(
  context: CalculationContext,
  rules: ScopedCommissionRule[]
): PrecedenceCalculationResult {
  // Get all applicable rules sorted by precedence
  const applicableRules = getApplicableRules(rules, context)

  // Track which rules matched
  const matchedRules = applicableRules.map((rule, index) => ({
    id: rule.id,
    scope: rule.scope,
    priority: rule.priority,
    selected: index === 0, // Only first rule is selected
  }))

  // Use highest priority rule (first in sorted list)
  const selectedRule = applicableRules[0]

  // If no rules apply, return zero commission
  if (!selectedRule) {
    return {
      baseAmount: 0,
      cappedAmount: 0,
      appliedRules: [],
      finalAmount: 0,
      basis: context.commissionBasis,
      basisAmount:
        context.commissionBasis === 'NET_SALES'
          ? context.netAmount
          : context.grossAmount,
      context: {
        customerTier: context.customerTier,
        productCategory: context.productCategoryId,
        territory: context.territoryId,
      },
      matchedRules,
    }
  }

  // Calculate using only the selected rule
  const basisAmount =
    context.commissionBasis === 'NET_SALES'
      ? context.netAmount
      : context.grossAmount

  const calculationResult = calculateCommission(basisAmount, [selectedRule])

  // Build scope description
  let scopeDescription = ''
  switch (selectedRule.scope) {
    case 'CUSTOMER_SPECIFIC':
      scopeDescription = 'Customer-specific rule'
      break
    case 'PRODUCT_CATEGORY':
      scopeDescription = 'Product category rule'
      break
    case 'TERRITORY':
      scopeDescription = 'Territory rule'
      break
    case 'CUSTOMER_TIER':
      scopeDescription = `${selectedRule.customerTier} tier rule`
      break
    case 'GLOBAL':
      scopeDescription = 'Global default rule'
      break
  }

  return {
    ...calculationResult,
    basis: context.commissionBasis,
    basisAmount,
    context: {
      customerTier: context.customerTier,
      productCategory: context.productCategoryId,
      territory: context.territoryId,
    },
    selectedRule: {
      id: selectedRule.id,
      scope: selectedRule.scope,
      priority: selectedRule.priority,
      description: scopeDescription,
    },
    matchedRules,
  }
}
