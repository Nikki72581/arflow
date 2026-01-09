'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, TrendingUp, Package, MapPin, Users, Globe } from 'lucide-react'
import type { RuleScope, RulePriority } from '@prisma/client'

interface RuleWithScope {
  id: string
  scope: RuleScope
  priority: RulePriority
  ruleType: string
  description?: string | null
  percentage?: number | null
  flatAmount?: number | null
  customerTier?: string | null
  productCategory?: {
    name: string
  } | null
  territory?: {
    name: string
  } | null
  client?: {
    name: string
  } | null
}

interface RulePrecedenceViewerProps {
  rules: RuleWithScope[]
}

const priorityLabels: Record<RulePriority, string> = {
  PROJECT_SPECIFIC: 'Project-Specific',
  CUSTOMER_SPECIFIC: 'Customer-Specific',
  PRODUCT_CATEGORY: 'Product Category',
  TERRITORY: 'Territory',
  CUSTOMER_TIER: 'Customer Tier',
  DEFAULT: 'Default',
}

const priorityValues: Record<RulePriority, number> = {
  PROJECT_SPECIFIC: 100,
  CUSTOMER_SPECIFIC: 90,
  PRODUCT_CATEGORY: 80,
  TERRITORY: 70,
  CUSTOMER_TIER: 60,
  DEFAULT: 50,
}

const scopeIcons: Record<RuleScope, any> = {
  GLOBAL: Globe,
  CUSTOMER_SPECIFIC: Crown,
  CUSTOMER_TIER: Users,
  PRODUCT_CATEGORY: Package,
  TERRITORY: MapPin,
}

function getScopeLabel(rule: RuleWithScope): string {
  switch (rule.scope) {
    case 'CUSTOMER_SPECIFIC':
      return rule.client?.name || 'Specific Customer'
    case 'CUSTOMER_TIER':
      return `${rule.customerTier || 'Unknown'} Tier`
    case 'PRODUCT_CATEGORY':
      return rule.productCategory?.name || 'Product Category'
    case 'TERRITORY':
      return rule.territory?.name || 'Territory'
    case 'GLOBAL':
      return 'All Transactions'
    default:
      return 'Unknown Scope'
  }
}

function getRuleAmount(rule: RuleWithScope): string {
  if (rule.percentage !== null && rule.percentage !== undefined) {
    return `${rule.percentage}%`
  }
  if (rule.flatAmount !== null && rule.flatAmount !== undefined) {
    return `$${rule.flatAmount.toFixed(2)}`
  }
  return 'Tiered'
}

export function RulePrecedenceViewer({ rules }: RulePrecedenceViewerProps) {
  // Sort rules by priority
  const sortedRules = [...rules].sort((a, b) => {
    const priorityDiff = priorityValues[b.priority] - priorityValues[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    // Same priority - use creation order (already in order from DB)
    return 0
  })

  if (rules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rule Precedence Hierarchy</CardTitle>
          <CardDescription>
            No rules defined yet. Add rules to see how they'll be prioritized.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rule Precedence Hierarchy
        </CardTitle>
        <CardDescription>
          When multiple rules match a transaction, the highest priority rule applies. Rules are evaluated in this order:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedRules.map((rule, index) => {
            const Icon = scopeIcons[rule.scope]
            const isHighest = index === 0

            return (
              <div
                key={rule.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  isHighest ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">
                      {getScopeLabel(rule)}
                    </span>
                    {isHighest && (
                      <Badge variant="default" className="ml-auto shrink-0">
                        Highest Priority
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-normal">
                      {priorityLabels[rule.priority]}
                    </Badge>
                    <span>•</span>
                    <span className="font-medium text-foreground">
                      {getRuleAmount(rule)}
                    </span>
                    {rule.description && (
                      <>
                        <span>•</span>
                        <span className="truncate">{rule.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">How It Works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When a sale is recorded, all matching rules are evaluated</li>
            <li>The rule with the highest priority (shown at the top) is applied</li>
            <li>Only one rule applies per transaction - the most specific match wins</li>
            <li>Global rules serve as fallbacks when no specific rules match</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
