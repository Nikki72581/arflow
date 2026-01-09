'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { createCommissionRule, updateCommissionRule } from '@/app/actions/commission-plans'
import { getProductCategories } from '@/app/actions/product-categories'
import { getTerritories } from '@/app/actions/territories'
import { getClients } from '@/app/actions/clients'

interface CommissionRule {
  id: string
  ruleType: 'PERCENTAGE' | 'FLAT_AMOUNT' | 'TIERED'
  percentage?: number | null
  flatAmount?: number | null
  minSaleAmount?: number | null
  maxSaleAmount?: number | null
  minAmount?: number | null
  maxAmount?: number | null
  description?: string | null
  scope?: 'GLOBAL' | 'CUSTOMER_TIER' | 'PRODUCT_CATEGORY' | 'TERRITORY' | 'CUSTOMER_SPECIFIC'
  customerTier?: 'STANDARD' | 'VIP' | 'NEW' | 'ENTERPRISE' | null
  productCategoryId?: string | null
  territoryId?: string | null
  clientId?: string | null
}

interface RuleFormDialogProps {
  planId: string
  rule?: CommissionRule
  trigger?: React.ReactNode
}

export function RuleFormDialog({ planId, rule, trigger }: RuleFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [ruleType, setRuleType] = useState<string>(rule?.ruleType || 'PERCENTAGE')
  const [showSaleAmountFilters, setShowSaleAmountFilters] = useState(
    !!rule?.minSaleAmount || !!rule?.maxSaleAmount
  )
  const [showCommissionCaps, setShowCommissionCaps] = useState(
    !!rule?.minAmount || !!rule?.maxAmount
  )
  const [showAdvanced, setShowAdvanced] = useState(!!rule?.scope && rule.scope !== 'GLOBAL')
  const [scope, setScope] = useState<string>(rule?.scope || 'GLOBAL')
  const [customerTier, setCustomerTier] = useState<string>(rule?.customerTier || '')
  const [productCategoryId, setProductCategoryId] = useState<string>(rule?.productCategoryId || '')
  const [territoryId, setTerritoryId] = useState<string>(rule?.territoryId || '')
  const [clientId, setClientId] = useState<string>(rule?.clientId || '')

  // Data for dropdowns
  const [categories, setCategories] = useState<any[]>([])
  const [territories, setTerritories] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  const isEdit = !!rule

  // Load data for scope selectors
  useEffect(() => {
    if (open && showAdvanced) {
      Promise.all([
        getProductCategories(),
        getTerritories(),
        getClients(),
      ]).then(([catResult, terrResult, clientResult]) => {
        if (catResult.success) setCategories(catResult.data || [])
        if (terrResult.success) setTerritories(terrResult.data || [])
        if (clientResult.success) setClients(clientResult.data || [])
      })
    }
  }, [open, showAdvanced])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setWarnings([])

    const formData = new FormData(e.currentTarget)

    const data: any = {
      commissionPlanId: planId,
      ruleType,
      description: formData.get('description') as string,
      minSaleAmount: formData.get('minSaleAmount') ? parseFloat(formData.get('minSaleAmount') as string) : undefined,
      maxSaleAmount: formData.get('maxSaleAmount') ? parseFloat(formData.get('maxSaleAmount') as string) : undefined,
      minAmount: formData.get('minAmount') ? parseFloat(formData.get('minAmount') as string) : undefined,
      maxAmount: formData.get('maxAmount') ? parseFloat(formData.get('maxAmount') as string) : undefined,
    }

    // Add type-specific fields
    if (ruleType === 'PERCENTAGE') {
      data.percentage = parseFloat(formData.get('percentage') as string)
    } else if (ruleType === 'FLAT_AMOUNT') {
      data.flatAmount = parseFloat(formData.get('flatAmount') as string)
    }

    // Add scope fields if advanced mode is enabled
    if (showAdvanced) {
      data.scope = scope
      if (scope === 'CUSTOMER_TIER') {
        data.customerTier = customerTier || undefined
      } else if (scope === 'PRODUCT_CATEGORY') {
        data.productCategoryId = productCategoryId || undefined
      } else if (scope === 'TERRITORY') {
        data.territoryId = territoryId || undefined
      } else if (scope === 'CUSTOMER_SPECIFIC') {
        data.clientId = clientId || undefined
      }
    } else {
      data.scope = 'GLOBAL'
    }

    try {
      const result = isEdit
        ? await updateCommissionRule(rule.id, data)
        : await createCommissionRule(data)

      if (result.success) {
        if (result.warnings && result.warnings.length > 0) {
          setWarnings(result.warnings)
          // Still close after showing warnings briefly
          setTimeout(() => {
            setOpen(false)
            router.refresh()
          }, 3000)
        } else {
          setOpen(false)
          router.refresh()
        }
      } else {
        setError(result.error || 'Something went wrong')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="add-rule-button">
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[760px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Rule' : 'Add Commission Rule'}</DialogTitle>
            <DialogDescription>
              Define how commissions are calculated for this plan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive sm:col-span-2">
                {error}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 sm:col-span-2">
                <p className="font-medium mb-1">Warning:</p>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="ruleType">
                Rule Type <span className="text-destructive">*</span>
              </Label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger data-testid="rule-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE" data-testid="rule-type-percentage">Percentage of Sale</SelectItem>
                  <SelectItem value="FLAT_AMOUNT" data-testid="rule-type-flat">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PERCENTAGE type fields */}
            {ruleType === 'PERCENTAGE' && (
              <div className="grid gap-2 sm:col-span-1">
                <Label htmlFor="percentage">
                  Percentage <span className="text-destructive">*</span>
                </Label>
                <NumberInput
                  id="percentage"
                  name="percentage"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={rule?.percentage || ''}
                  placeholder="10"
                  endAdornment="%"
                  required
                  data-testid="rule-value-input"
                />
                <p className="text-xs text-muted-foreground">
                  E.g., 10% means $1,000 commission on $10,000 sale
                </p>
              </div>
            )}

            {/* FLAT_AMOUNT type fields */}
            {ruleType === 'FLAT_AMOUNT' && (
              <div className="grid gap-2 sm:col-span-1">
                <Label htmlFor="flatAmount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <NumberInput
                  id="flatAmount"
                  name="flatAmount"
                  step="0.01"
                  min="0"
                  defaultValue={rule?.flatAmount ?? '0.00'}
                  placeholder="500"
                  startAdornment="$"
                  required
                  data-testid="rule-value-input"
                />
                <p className="text-xs text-muted-foreground">
                  Fixed amount paid per sale, regardless of sale size
                </p>
              </div>
            )}


            {/* Sale Amount Filters */}
            <div className="border-t pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSaleAmountFilters(!showSaleAmountFilters)}
                className="w-full justify-between"
                aria-expanded={showSaleAmountFilters}
              >
                <span className="text-sm font-medium">Sale Amount Filters</span>
                {showSaleAmountFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <div className={`mt-3 space-y-3 ${showSaleAmountFilters ? '' : 'hidden'}`}>
                <p className="text-xs text-muted-foreground">
                  Apply this rule only to sales within a specific amount range. Leave blank to apply to all amounts.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minSaleAmount">Minimum Sale</Label>
                    <NumberInput
                      id="minSaleAmount"
                      name="minSaleAmount"
                      step="0.01"
                      min="0"
                      defaultValue={rule?.minSaleAmount || ''}
                      placeholder="0"
                      startAdornment="$"
                    />
                    <p className="text-xs text-muted-foreground">Sales must be at least this amount</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxSaleAmount">Maximum Sale</Label>
                    <NumberInput
                      id="maxSaleAmount"
                      name="maxSaleAmount"
                      step="0.01"
                      min="0"
                      defaultValue={rule?.maxSaleAmount || ''}
                      placeholder="No limit"
                      startAdornment="$"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for no upper limit</p>
                  </div>
                </div>
                <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/20">
                  <p className="text-xs text-blue-900 dark:text-blue-200">
                    <strong>Example:</strong> Set min=$10,000 and max=$50,000 to apply this rule only to sales between
                    $10k-$50k
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCommissionCaps(!showCommissionCaps)}
                className="w-full justify-between"
                aria-expanded={showCommissionCaps}
              >
                <span className="text-sm font-medium">Commission Caps</span>
                {showCommissionCaps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <div className={`mt-3 space-y-3 ${showCommissionCaps ? '' : 'hidden'}`}>
                <p className="text-xs text-muted-foreground">
                  Set minimum or maximum limits on the commission amount (not the sale amount).
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minAmount">Minimum Commission</Label>
                    <NumberInput
                      id="minAmount"
                      name="minAmount"
                      step="0.01"
                      min="0"
                      defaultValue={rule?.minAmount || ''}
                      placeholder="0"
                      startAdornment="$"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxAmount">Maximum Commission</Label>
                    <NumberInput
                      id="maxAmount"
                      name="maxAmount"
                      step="0.01"
                      min="0"
                      defaultValue={rule?.maxAmount || ''}
                      placeholder="No limit"
                      startAdornment="$"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced: Rule Scope */}
            <div className="border-t pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">Advanced: Target Specific Transactions</span>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <p>
                      By default, rules apply globally. Use these options to target specific customer tiers, product categories, territories, or individual customers.
                      Higher precedence rules override lower ones.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="scope">Apply This Rule To</Label>
                    <Select value={scope} onValueChange={setScope}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL">All Transactions (Default)</SelectItem>
                        <SelectItem value="CUSTOMER_TIER">Specific Customer Tier</SelectItem>
                        <SelectItem value="PRODUCT_CATEGORY">Specific Product Category</SelectItem>
                        <SelectItem value="TERRITORY">Specific Territory</SelectItem>
                        <SelectItem value="CUSTOMER_SPECIFIC">Specific Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scope === 'CUSTOMER_TIER' && (
                    <div className="grid gap-2">
                      <Label htmlFor="customerTier">Customer Tier</Label>
                      <Select value={customerTier} onValueChange={setCustomerTier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD">Standard</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                          <SelectItem value="NEW">New Customer</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope === 'PRODUCT_CATEGORY' && (
                    <div className="grid gap-2">
                      <Label htmlFor="productCategoryId">Product Category</Label>
                      <Select value={productCategoryId} onValueChange={setProductCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope === 'TERRITORY' && (
                    <div className="grid gap-2">
                      <Label htmlFor="territoryId">Territory</Label>
                      <Select value={territoryId} onValueChange={setTerritoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select territory" />
                        </SelectTrigger>
                        <SelectContent>
                          {territories.map((terr) => (
                            <SelectItem key={terr.id} value={terr.id}>
                              {terr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scope === 'CUSTOMER_SPECIFIC' && (
                    <div className="grid gap-2">
                      <Label htmlFor="clientId">Customer</Label>
                      <Select value={clientId} onValueChange={setClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={rule?.description || ''}
                placeholder="Add notes about this rule..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
