'use client'

import { useState, useTransition, useMemo } from 'react'
import { Info, TrendingUp, Calculator, DollarSign, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface CommissionMetadata {
  basis?: string
  basisAmount?: number
  grossAmount?: number
  netAmount?: number
  context?: {
    customerTier?: string
    customerId?: string
    customerName?: string
    productCategoryId?: string
    territoryId?: string
    territoryName?: string
    projectId?: string
  }
  selectedRule?: {
    id: string
    name?: string
    scope?: string
    priority?: string
    description?: string
  }
  matchedRules?: Array<{
    id: string
    scope?: string
    priority?: string
    selected: boolean
  }>
  appliedRules?: Array<{
    ruleId: string
    ruleType: string
    calculatedAmount: number
    description: string
  }>
  calculatedAt?: string
  recalculated?: boolean
}

interface CommissionDetailDialogProps {
  calculation: {
    id: string
    amount: number
    status: string
    calculatedAt: Date
    metadata?: CommissionMetadata | any
    salesTransaction?: {
      amount: number
      transactionDate: Date
      description?: string | null
      invoiceNumber?: string | null
    }
    commissionPlan: {
      name: string
      commissionBasis?: string | null
    }
    user?: {
      firstName: string | null
      lastName: string | null
    }
  }
  // Allow passing additional context for cases where the calculation doesn't have all relations
  salesAmount?: number
  salesDate?: Date
  salesDescription?: string | null
  salesInvoice?: string | null
  salespersonName?: string
  trigger?: React.ReactNode
}

export function CommissionDetailDialog({
  calculation,
  salesAmount,
  salesDate,
  salesDescription,
  salesInvoice,
  salespersonName,
  trigger,
}: CommissionDetailDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (newOpen: boolean) => {
    startTransition(() => {
      setOpen(newOpen)
    })
  }

  // Memoize expensive calculations
  const metadata = useMemo(() => calculation.metadata as CommissionMetadata || {}, [calculation.metadata])
  const hasDetailedBreakdown = useMemo(() => metadata.selectedRule || metadata.appliedRules?.length, [metadata])

  // Use provided values or fallback to calculation relations
  const saleAmount = salesAmount ?? calculation.salesTransaction?.amount ?? 0
  const saleDate = salesDate ?? calculation.salesTransaction?.transactionDate
  const saleDescription = salesDescription ?? calculation.salesTransaction?.description
  const saleInvoice = salesInvoice ?? calculation.salesTransaction?.invoiceNumber
  const personName = salespersonName ?? (calculation.user ? `${calculation.user.firstName || ''} ${calculation.user.lastName || ''}`.trim() : '')

  const commissionRate = useMemo(() =>
    saleAmount > 0 ? (calculation.amount / saleAmount) * 100 : 0,
    [saleAmount, calculation.amount]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Info className="mr-2 h-4 w-4" />
            View Details
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Commission Calculation Details
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of how this commission was calculated
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {personName && (
                  <div>
                    <div className="text-sm text-muted-foreground">Salesperson</div>
                    <div className="font-medium">{personName}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>
                    <Badge
                      variant={
                        calculation.status === 'PAID'
                          ? 'default'
                          : calculation.status === 'APPROVED'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {calculation.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Sale Amount</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(saleAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Commission</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(calculation.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rate</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {commissionRate.toFixed(2)}%
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                {saleDate && (
                  <div>
                    <div className="text-muted-foreground">Sale Date</div>
                    <div>{formatDate(saleDate)}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Calculated At</div>
                  <div className="flex items-center gap-1">
                    {formatDate(calculation.calculatedAt)}
                    {metadata.recalculated && (
                      <Badge variant="outline" className="text-xs">
                        Recalculated
                      </Badge>
                    )}
                  </div>
                </div>
                {saleInvoice && (
                  <div>
                    <div className="text-muted-foreground">Invoice Number</div>
                    <div>{saleInvoice}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Commission Plan</div>
                  <div className="font-medium">{calculation.commissionPlan.name}</div>
                </div>
              </div>

              {saleDescription && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground">Description</div>
                    <div className="text-sm">{saleDescription}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Calculation Basis */}
          {metadata.basis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Calculation Basis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Basis Type</div>
                    <div className="font-medium">
                      {metadata.basis === 'NET_SALES' ? 'Net Sales' : 'Gross Sales'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Basis Amount</div>
                    <div className="font-medium">
                      {formatCurrency(metadata.basisAmount || 0)}
                    </div>
                  </div>
                </div>

                {metadata.grossAmount && metadata.netAmount && metadata.grossAmount !== metadata.netAmount && (
                  <>
                    <Separator />
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Amount Breakdown
                      </div>
                      <div className="space-y-1 text-blue-700 dark:text-blue-300">
                        <div className="flex justify-between">
                          <span>Gross Amount:</span>
                          <span className="font-medium">{formatCurrency(metadata.grossAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Amount:</span>
                          <span className="font-medium">{formatCurrency(metadata.netAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-blue-200 dark:border-blue-800">
                          <span>Difference:</span>
                          <span className="font-medium">
                            {formatCurrency(metadata.grossAmount - metadata.netAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Context Information */}
          {metadata.context && Object.keys(metadata.context).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Calculation Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {metadata.context.customerName && (
                    <div>
                      <div className="text-muted-foreground">Client</div>
                      <div className="font-medium">{metadata.context.customerName}</div>
                    </div>
                  )}
                  {metadata.context.customerTier && (
                    <div>
                      <div className="text-muted-foreground">Client Tier</div>
                      <div>
                        <Badge variant="outline">{metadata.context.customerTier}</Badge>
                      </div>
                    </div>
                  )}
                  {metadata.context.territoryName && (
                    <div>
                      <div className="text-muted-foreground">Territory</div>
                      <div className="font-medium">{metadata.context.territoryName}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rule Selection & Matching */}
          {hasDetailedBreakdown && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rule Application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Rule */}
                {metadata.selectedRule && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <div className="font-medium text-green-900 dark:text-green-100">
                        Selected Rule
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                      {metadata.selectedRule.name && (
                        <div className="font-medium">{metadata.selectedRule.name}</div>
                      )}
                      {metadata.selectedRule.description && (
                        <div>{metadata.selectedRule.description}</div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {metadata.selectedRule.scope && (
                          <Badge variant="outline" className="text-xs">
                            Scope: {metadata.selectedRule.scope}
                          </Badge>
                        )}
                        {metadata.selectedRule.priority && (
                          <Badge variant="outline" className="text-xs">
                            Priority: {metadata.selectedRule.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Matched but not selected rules */}
                {metadata.matchedRules && metadata.matchedRules.filter(r => !r.selected).length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      Other Matched Rules (not applied due to precedence)
                    </div>
                    <div className="space-y-2">
                      {metadata.matchedRules
                        .filter(r => !r.selected)
                        .map((rule, index) => (
                          <div
                            key={rule.id || index}
                            className="bg-muted p-2 rounded text-sm flex justify-between items-center"
                          >
                            <div className="text-muted-foreground">Rule ID: {rule.id}</div>
                            <div className="flex gap-2">
                              {rule.scope && (
                                <Badge variant="outline" className="text-xs">
                                  {rule.scope}
                                </Badge>
                              )}
                              {rule.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {rule.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Applied Rules Breakdown */}
                {metadata.appliedRules && metadata.appliedRules.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Applied Rules Breakdown</div>
                    <div className="space-y-2">
                      {metadata.appliedRules.map((rule, index) => (
                        <div
                          key={rule.ruleId || index}
                          className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
                              {rule.ruleType}
                            </div>
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(rule.calculatedAmount)}
                            </div>
                          </div>
                          {rule.description && (
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {metadata.appliedRules.length > 1 && (
                      <div className="mt-3 pt-3 border-t flex justify-between items-center font-medium">
                        <span>Total Commission:</span>
                        <span className="text-lg text-green-600 dark:text-green-400">
                          {formatCurrency(
                            metadata.appliedRules.reduce(
                              (sum, rule) => sum + rule.calculatedAmount,
                              0
                            )
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
