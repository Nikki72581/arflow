import type { RuleScope, RulePriority, CustomerTier } from '@prisma/client'

export interface RuleValidationError {
  field: string
  message: string
}

export interface ScopedRuleInput {
  scope: RuleScope
  priority?: RulePriority
  customerTier?: CustomerTier | null
  productCategoryId?: string | null
  territoryId?: string | null
  clientId?: string | null
}

/**
 * Validates scoped commission rule configuration
 * Ensures required fields are present based on scope
 */
export function validateScopedRule(
  rule: ScopedRuleInput
): { valid: boolean; errors: RuleValidationError[] } {
  const errors: RuleValidationError[] = []

  // Validate scope-specific required fields
  switch (rule.scope) {
    case 'CUSTOMER_TIER':
      if (!rule.customerTier) {
        errors.push({
          field: 'customerTier',
          message: 'Customer tier is required for CUSTOMER_TIER scope',
        })
      }
      break

    case 'PRODUCT_CATEGORY':
      if (!rule.productCategoryId) {
        errors.push({
          field: 'productCategoryId',
          message: 'Product category is required for PRODUCT_CATEGORY scope',
        })
      }
      break

    case 'TERRITORY':
      if (!rule.territoryId) {
        errors.push({
          field: 'territoryId',
          message: 'Territory is required for TERRITORY scope',
        })
      }
      break

    case 'CUSTOMER_SPECIFIC':
      if (!rule.clientId) {
        errors.push({
          field: 'clientId',
          message: 'Client is required for CUSTOMER_SPECIFIC scope',
        })
      }
      break

    case 'GLOBAL':
      // No additional fields required
      break
  }

  // Warn if unnecessary fields are set
  if (rule.scope !== 'CUSTOMER_TIER' && rule.customerTier) {
    errors.push({
      field: 'customerTier',
      message: 'Customer tier should only be set for CUSTOMER_TIER scope',
    })
  }

  if (rule.scope !== 'PRODUCT_CATEGORY' && rule.productCategoryId) {
    errors.push({
      field: 'productCategoryId',
      message: 'Product category should only be set for PRODUCT_CATEGORY scope',
    })
  }

  if (rule.scope !== 'TERRITORY' && rule.territoryId) {
    errors.push({
      field: 'territoryId',
      message: 'Territory should only be set for TERRITORY scope',
    })
  }

  if (rule.scope !== 'CUSTOMER_SPECIFIC' && rule.clientId) {
    errors.push({
      field: 'clientId',
      message: 'Client should only be set for CUSTOMER_SPECIFIC scope',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Auto-assigns priority based on scope if not explicitly set
 */
export function assignPriorityFromScope(scope: RuleScope): RulePriority {
  const scopeToPriority: Record<RuleScope, RulePriority> = {
    GLOBAL: 'DEFAULT',
    CUSTOMER_TIER: 'CUSTOMER_TIER',
    PRODUCT_CATEGORY: 'PRODUCT_CATEGORY',
    TERRITORY: 'TERRITORY',
    CUSTOMER_SPECIFIC: 'CUSTOMER_SPECIFIC',
  }

  return scopeToPriority[scope]
}

/**
 * Gets numeric value of priority for sorting
 */
export function getPriorityValue(priority: RulePriority): number {
  const priorityValues: Record<RulePriority, number> = {
    PROJECT_SPECIFIC: 100,
    CUSTOMER_SPECIFIC: 90,
    PRODUCT_CATEGORY: 80,
    TERRITORY: 70,
    CUSTOMER_TIER: 60,
    DEFAULT: 50,
  }

  return priorityValues[priority]
}

/**
 * Compares two rules for sorting by precedence
 * Higher priority first, then newest first
 */
export function compareRulePrecedence(
  a: { priority: RulePriority; createdAt: Date },
  b: { priority: RulePriority; createdAt: Date }
): number {
  const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority)

  if (priorityDiff !== 0) {
    return priorityDiff
  }

  // Same priority - use creation date (newest first)
  return b.createdAt.getTime() - a.createdAt.getTime()
}

/**
 * Detects potential conflicts between rules
 */
export function detectRuleConflicts(
  newRule: ScopedRuleInput,
  existingRules: Array<ScopedRuleInput & { id: string; name?: string }>
): Array<{ ruleId: string; ruleName?: string; reason: string }> {
  const conflicts: Array<{ ruleId: string; ruleName?: string; reason: string }> = []

  for (const existing of existingRules) {
    // Check for duplicate scope configurations
    if (
      existing.scope === newRule.scope &&
      existing.customerTier === newRule.customerTier &&
      existing.productCategoryId === newRule.productCategoryId &&
      existing.territoryId === newRule.territoryId &&
      existing.clientId === newRule.clientId
    ) {
      conflicts.push({
        ruleId: existing.id,
        ruleName: existing.name,
        reason: `Duplicate rule with same scope and filters. The newer rule will take precedence.`,
      })
    }
  }

  return conflicts
}
