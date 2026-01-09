'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { previewCommission } from '@/lib/commission-calculator'
import type { CommissionRule } from '@prisma/client'
import { Calculator } from 'lucide-react'

interface CommissionPreviewProps {
  rules: CommissionRule[]
}

export function CommissionPreview({ rules }: CommissionPreviewProps) {
  const [saleAmount, setSaleAmount] = useState(10000)

  if (rules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Commission Preview
          </CardTitle>
          <CardDescription>
            Add rules to see how commissions would be calculated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No rules defined yet. Add a rule to preview calculations.
          </p>
        </CardContent>
      </Card>
    )
  }

  const preview = previewCommission(saleAmount, rules)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Commission Preview
        </CardTitle>
        <CardDescription>
          See how commissions are calculated for different sale amounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sale Amount Input */}
        <div className="grid gap-2">
          <Label htmlFor="previewAmount">Sale Amount</Label>
          <NumberInput
            id="previewAmount"
            step="100"
            min="0"
            value={saleAmount}
            onChange={(e) => setSaleAmount(parseFloat(e.target.value) || 0)}
            className="text-lg font-medium"
            startAdornment="$"
          />
        </div>

        <Separator className="bg-emerald-500/20" />

        {/* Calculation Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Calculation Breakdown</h4>
          
          {preview.rules.map((rule, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Rule {index + 1}: {rule.type}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rule.description}
                </div>
              </div>
              <div className="text-sm font-semibold whitespace-nowrap">
                {formatCurrency(rule.amount)}
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-emerald-500/20" />

        {/* Total */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Commission</div>
            <div className="text-xs text-muted-foreground mt-1">
              {((preview.totalCommission / saleAmount) * 100).toFixed(2)}% of sale
            </div>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(preview.totalCommission)}
          </div>
        </div>

        {/* Quick Examples */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Quick Examples</h4>
          <div className="grid grid-cols-3 gap-2">
            {[5000, 10000, 25000, 50000, 100000, 250000].map((amount) => {
              const quickPreview = previewCommission(amount, rules)
              return (
                <button
                  key={amount}
                  onClick={() => setSaleAmount(amount)}
                  className="rounded-lg border p-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(amount)}
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(quickPreview.totalCommission)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
