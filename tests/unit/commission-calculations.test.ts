import { describe, it, expect } from 'vitest'
import {
  calculateCommission,
  calculateCommissionWithContext,
  calculateCommissionWithPrecedence,
  type CalculationContext,
} from '@/lib/commission-calculator'
import type {
  CommissionRule,
  CommissionBasis,
  CommissionRuleType,
  CustomerTier,
  RuleScope,
  RulePriority,
} from '@prisma/client'

// Helper function to create a test rule with defaults
function createTestRule(
  overrides: Partial<CommissionRule> = {}
): CommissionRule {
  return {
    id: 'test-rule-1',
    commissionPlanId: 'plan-1',
    ruleType: 'PERCENTAGE' as CommissionRuleType,
    percentage: 10,
    flatAmount: null,
    tierThreshold: null,
    tierPercentage: null,
    minSaleAmount: null,
    maxSaleAmount: null,
    minAmount: null,
    maxAmount: null,
    description: null,
    scope: 'GLOBAL' as RuleScope,
    priority: 'DEFAULT' as RulePriority,
    customerTier: null,
    productCategoryId: null,
    territoryId: null,
    clientId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('Commission Calculator', () => {
  describe('calculateCommission - Basic Calculations', () => {
    describe('PERCENTAGE-based commissions', () => {
      it('should calculate basic percentage commission correctly', () => {
        const rule = createTestRule({ percentage: 10 })
        const result = calculateCommission(10000, [rule])

        expect(result.finalAmount).toBe(1000)
        expect(result.appliedRules).toHaveLength(1)
        expect(result.appliedRules[0].calculatedAmount).toBe(1000)
      })

      it('should handle decimal percentages correctly', () => {
        const rule = createTestRule({ percentage: 7.5 })
        const result = calculateCommission(10000, [rule])

        expect(result.finalAmount).toBe(750)
      })

      it('should handle small sale amounts', () => {
        const rule = createTestRule({ percentage: 10 })
        const result = calculateCommission(100, [rule])

        expect(result.finalAmount).toBe(10)
      })

      it('should handle zero sale amount', () => {
        const rule = createTestRule({ percentage: 10 })
        const result = calculateCommission(0, [rule])

        expect(result.finalAmount).toBe(0)
      })

      it('should handle negative sale amounts (returns)', () => {
        const rule = createTestRule({ percentage: 10 })
        const result = calculateCommission(-5000, [rule])

        expect(result.finalAmount).toBe(-500)
      })
    })

    describe('FLAT_AMOUNT commissions', () => {
      it('should calculate flat amount commission correctly', () => {
        const rule = createTestRule({
          ruleType: 'FLAT_AMOUNT',
          flatAmount: 500,
          percentage: null,
        })
        const result = calculateCommission(10000, [rule])

        expect(result.finalAmount).toBe(500)
      })

      it('should apply flat amount regardless of sale size', () => {
        const rule = createTestRule({
          ruleType: 'FLAT_AMOUNT',
          flatAmount: 500,
          percentage: null,
        })

        const smallSale = calculateCommission(100, [rule])
        const largeSale = calculateCommission(100000, [rule])

        expect(smallSale.finalAmount).toBe(500)
        expect(largeSale.finalAmount).toBe(500)
      })
    })

    describe('Amount Range Filtering', () => {
      it('should apply rule when sale is within amount range', () => {
        const rule = createTestRule({
          percentage: 5,
          minSaleAmount: 5000,
          maxSaleAmount: 15000,
        })

        const context: CalculationContext = {
          grossAmount: 10000,
          netAmount: 10000,
          transactionDate: new Date(),
          commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        }

        const result = calculateCommissionWithPrecedence(context, [rule] as any)
        // Should apply 5% rule
        expect(result.finalAmount).toBe(500)
      })

      it('should not apply rule when sale is below minimum', () => {
        const rule = createTestRule({
          percentage: 5,
          minSaleAmount: 10000,
        })

        const context: CalculationContext = {
          grossAmount: 8000, // Below minimum
          netAmount: 8000,
          transactionDate: new Date(),
          commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        }

        const result = calculateCommissionWithPrecedence(context, [rule] as any)
        // Should not apply rule
        expect(result.finalAmount).toBe(0)
      })

      it('should not apply rule when sale is above maximum', () => {
        const rule = createTestRule({
          percentage: 5,
          maxSaleAmount: 10000,
        })

        const context: CalculationContext = {
          grossAmount: 15000, // Above maximum
          netAmount: 15000,
          transactionDate: new Date(),
          commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        }

        const result = calculateCommissionWithPrecedence(context, [rule] as any)
        // Should not apply rule
        expect(result.finalAmount).toBe(0)
      })

      it('should select correct rule based on sale amount ranges', () => {
        const rules = [
          createTestRule({
            id: 'rule-1',
            percentage: 2,
            minSaleAmount: 0,
            maxSaleAmount: 10000,
            priority: 'DEFAULT' as RulePriority,
          }),
          createTestRule({
            id: 'rule-2',
            percentage: 4,
            minSaleAmount: 10000,
            maxSaleAmount: null, // No upper limit
            priority: 'DEFAULT' as RulePriority,
          }),
        ]

        // $8k sale should use 2% rule
        const result1 = calculateCommissionWithPrecedence(
          {
            grossAmount: 8000,
            netAmount: 8000,
            transactionDate: new Date(),
            commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
          },
          rules as any
        )
        expect(result1.finalAmount).toBe(160) // 2% of 8000

        // $15k sale should use 4% rule
        const result2 = calculateCommissionWithPrecedence(
          {
            grossAmount: 15000,
            netAmount: 15000,
            transactionDate: new Date(),
            commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
          },
          rules as any
        )
        expect(result2.finalAmount).toBe(600) // 4% of 15000
      })

      it('should combine amount range with customer tier filters', () => {
        const rules = [
          createTestRule({
            id: 'rule-1',
            scope: 'CUSTOMER_TIER' as RuleScope,
            customerTier: 'VIP' as CustomerTier,
            percentage: 15,
            minSaleAmount: 50000,
            priority: 'CUSTOMER_TIER' as RulePriority,
          }),
          createTestRule({
            id: 'rule-2',
            scope: 'GLOBAL' as RuleScope,
            percentage: 5,
            priority: 'DEFAULT' as RulePriority,
          }),
        ]

        // VIP customer with $60k sale should get 15% (meets tier AND amount)
        const result1 = calculateCommissionWithPrecedence(
          {
            grossAmount: 60000,
            netAmount: 60000,
            transactionDate: new Date(),
            commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
            customerTier: 'VIP' as CustomerTier,
          },
          rules as any
        )
        expect(result1.finalAmount).toBe(9000) // 15% of 60000

        // VIP customer with $40k sale should get 5% (meets tier but NOT amount minimum)
        const result2 = calculateCommissionWithPrecedence(
          {
            grossAmount: 40000,
            netAmount: 40000,
            transactionDate: new Date(),
            commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
            customerTier: 'VIP' as CustomerTier,
          },
          rules as any
        )
        expect(result2.finalAmount).toBe(2000) // 5% of 40000 (fallback to global)

        // Standard customer with $60k sale should get 5% (meets amount but NOT tier)
        const result3 = calculateCommissionWithPrecedence(
          {
            grossAmount: 60000,
            netAmount: 60000,
            transactionDate: new Date(),
            commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
            customerTier: 'STANDARD' as CustomerTier,
          },
          rules as any
        )
        expect(result3.finalAmount).toBe(3000) // 5% of 60000 (fallback to global)
      })
    })

    describe('Commission caps (min/max)', () => {
      it('should apply minimum cap when calculated amount is below min', () => {
        const rule = createTestRule({
          percentage: 10,
          minAmount: 200,
        })

        // 10% of $1000 = $100, but min is $200
        const result = calculateCommission(1000, [rule])
        expect(result.finalAmount).toBe(200)
      })

      it('should apply maximum cap when calculated amount exceeds max', () => {
        const rule = createTestRule({
          percentage: 10,
          maxAmount: 5000,
        })

        // 10% of $100,000 = $10,000, but max is $5000
        const result = calculateCommission(100000, [rule])
        expect(result.finalAmount).toBe(5000)
      })

      it('should handle both min and max caps', () => {
        const rule = createTestRule({
          percentage: 10,
          minAmount: 200,
          maxAmount: 5000,
        })

        // Test min cap
        const minResult = calculateCommission(1000, [rule])
        expect(minResult.finalAmount).toBe(200)

        // Test max cap
        const maxResult = calculateCommission(100000, [rule])
        expect(maxResult.finalAmount).toBe(5000)

        // Test normal (between min and max)
        const normalResult = calculateCommission(30000, [rule])
        expect(normalResult.finalAmount).toBe(3000)
      })

      it('should not cap when amount is within min/max range', () => {
        const rule = createTestRule({
          percentage: 10,
          minAmount: 200,
          maxAmount: 5000,
        })

        const result = calculateCommission(30000, [rule])
        expect(result.finalAmount).toBe(3000)
      })
    })
  })

  describe('calculateCommissionWithContext - Commission Basis', () => {
    it('should calculate on GROSS_REVENUE basis', () => {
      const rule = createTestRule({ percentage: 10 })

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 8000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
      }

      const result = calculateCommissionWithContext(context, [rule])

      // Should use gross revenue (10000)
      expect(result.finalAmount).toBe(1000)
      expect(result.basisAmount).toBe(10000)
    })

    it('should calculate on NET_SALES basis', () => {
      const rule = createTestRule({ percentage: 10 })

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 8000,
        transactionDate: new Date(),
        commissionBasis: 'NET_SALES' as CommissionBasis,
      }

      const result = calculateCommissionWithContext(context, [rule])

      // Should use net sales (8000)
      expect(result.finalAmount).toBe(800)
      expect(result.basisAmount).toBe(8000)
    })

    it('should default to GROSS_REVENUE when using grossAmount', () => {
      const rule = createTestRule({ percentage: 10 })

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 8000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
      }

      const result = calculateCommissionWithContext(context, [rule])
      expect(result.finalAmount).toBe(1000)
      expect(result.basis).toBe('GROSS_REVENUE')
    })
  })

  describe('calculateCommissionWithPrecedence - Rule Matching', () => {
    it('should select higher priority rule', () => {
      const rules = [
        createTestRule({
          id: 'rule-1',
          percentage: 5,
          priority: 'DEFAULT' as RulePriority,
        }),
        createTestRule({
          id: 'rule-2',
          percentage: 10,
          priority: 'PROJECT_SPECIFIC' as RulePriority,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 10000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        projectId: 'project-1',
      }

      const result = calculateCommissionWithPrecedence(context, rules as any)

      // Should use higher priority rule (10%)
      expect(result.finalAmount).toBe(1000)
      expect(result.selectedRule?.priority).toBe('PROJECT_SPECIFIC')
    })

    it('should select CUSTOMER_TIER rule when tier matches', () => {
      const rules = [
        createTestRule({
          id: 'rule-1',
          scope: 'GLOBAL' as RuleScope,
          percentage: 5,
          priority: 'DEFAULT' as RulePriority,
        }),
        createTestRule({
          id: 'rule-2',
          scope: 'CUSTOMER_TIER' as RuleScope,
          percentage: 8,
          customerTier: 'VIP' as CustomerTier,
          priority: 'CUSTOMER_TIER' as RulePriority,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 10000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        customerTier: 'VIP' as CustomerTier,
      }

      const result = calculateCommissionWithPrecedence(context, rules as any)

      // Should use VIP tier rule (8%)
      expect(result.finalAmount).toBe(800)
    })

    it('should select CUSTOMER_SPECIFIC rule with highest priority', () => {
      const rules = [
        createTestRule({
          id: 'rule-1',
          scope: 'GLOBAL' as RuleScope,
          percentage: 5,
          priority: 'DEFAULT' as RulePriority,
        }),
        createTestRule({
          id: 'rule-2',
          scope: 'CUSTOMER_SPECIFIC' as RuleScope,
          percentage: 12,
          clientId: 'client-123',
          priority: 'CUSTOMER_SPECIFIC' as RulePriority,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 10000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        customerId: 'client-123',
      }

      const result = calculateCommissionWithPrecedence(context, rules as any)

      // Should use customer-specific rule (12%)
      expect(result.finalAmount).toBe(1200)
    })

    it('should fall back to GLOBAL rule when no specific rules match', () => {
      const rules = [
        createTestRule({
          id: 'rule-1',
          scope: 'GLOBAL' as RuleScope,
          percentage: 5,
          priority: 'DEFAULT' as RulePriority,
        }),
        createTestRule({
          id: 'rule-2',
          scope: 'CUSTOMER_TIER' as RuleScope,
          percentage: 8,
          customerTier: 'VIP' as CustomerTier,
          priority: 'CUSTOMER_TIER' as RulePriority,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 10000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        customerTier: 'STANDARD' as CustomerTier, // Doesn't match VIP
      }

      const result = calculateCommissionWithPrecedence(context, rules as any)

      // Should fall back to GLOBAL rule (5%)
      expect(result.finalAmount).toBe(500)
    })

    it('should return zero when no rules match', () => {
      const rules = [
        createTestRule({
          id: 'rule-1',
          scope: 'CUSTOMER_SPECIFIC' as RuleScope,
          percentage: 12,
          clientId: 'client-456',
          priority: 'CUSTOMER_SPECIFIC' as RulePriority,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 10000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
        customerId: 'client-123', // Different client
      }

      const result = calculateCommissionWithPrecedence(context, rules as any)

      expect(result.finalAmount).toBe(0)
      expect(result.appliedRules).toHaveLength(0)
    })
  })

  describe('Stacked Rules', () => {
    it('should stack PERCENTAGE + FLAT_AMOUNT rules', () => {
      const rules = [
        createTestRule({ percentage: 10 }),
        createTestRule({
          id: 'rule-2',
          ruleType: 'FLAT_AMOUNT',
          flatAmount: 500,
          percentage: null,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 10000,
        netAmount: 10000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
      }

      const result = calculateCommissionWithContext(context, rules)

      // 10% of $10,000 = $1,000 + $500 flat = $1,500
      expect(result.finalAmount).toBe(1500)
      expect(result.appliedRules).toHaveLength(2)
    })

    it('should apply caps to each rule independently', () => {
      const rules = [
        createTestRule({
          percentage: 10,
          maxAmount: 2000,
        }),
        createTestRule({
          id: 'rule-2',
          ruleType: 'FLAT_AMOUNT',
          flatAmount: 500,
          percentage: null,
        }),
      ]

      const context: CalculationContext = {
        grossAmount: 100000,
        netAmount: 100000,
        transactionDate: new Date(),
        commissionBasis: 'GROSS_REVENUE' as CommissionBasis,
      }

      const result = calculateCommissionWithContext(context, rules)

      // Percentage: 10% of $100k = $10k, capped at $2k
      // Flat: $500
      // Total = $2,500
      expect(result.finalAmount).toBe(2500)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle empty rules array', () => {
      const result = calculateCommission(10000, [])

      expect(result.finalAmount).toBe(0)
      expect(result.appliedRules).toHaveLength(0)
    })

    it('should handle very large sale amounts', () => {
      const rule = createTestRule({ percentage: 10 })
      const result = calculateCommission(10000000, [rule]) // $10 million

      expect(result.finalAmount).toBe(1000000) // $1 million
    })

    it('should handle rules with null percentage gracefully', () => {
      const rule = createTestRule({
        ruleType: 'PERCENTAGE',
        percentage: null, // Invalid but should handle gracefully
      })

      const result = calculateCommission(10000, [rule])

      // Should handle gracefully - likely return 0
      expect(result).toBeDefined()
      expect(typeof result.finalAmount).toBe('number')
    })
  })
})
