'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { LineItemFormData, CalculatedTotals } from '@/lib/types'

interface LineItem extends LineItemFormData {
  tempId: string // Temporary ID for UI tracking
}

interface LineItemsFormProps {
  initialLineItems?: LineItemFormData[]
  onChange: (lineItems: LineItemFormData[], totals: CalculatedTotals) => void
}

export function LineItemsForm({ initialLineItems = [], onChange }: LineItemsFormProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (initialLineItems.length > 0) {
      return initialLineItems.map((item, index) => ({
        ...item,
        tempId: item.id || `temp-${index}`,
      }))
    }
    return [createEmptyLineItem()]
  })

  function createEmptyLineItem(): LineItem {
    return {
      tempId: `temp-${Date.now()}-${Math.random()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
    }
  }

  function calculateLineTotal(item: LineItem): number {
    const subtotal = item.quantity * item.unitPrice
    const discount = subtotal * (item.discountPercent / 100)
    const taxable = subtotal - discount
    const tax = taxable * (item.taxPercent / 100)
    return taxable + tax
  }

  function calculateTotals(): CalculatedTotals {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const totalDiscount = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice
      return sum + (lineSubtotal * (item.discountPercent / 100))
    }, 0)
    const totalTax = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unitPrice
      const discount = lineSubtotal * (item.discountPercent / 100)
      const taxable = lineSubtotal - discount
      return sum + (taxable * (item.taxPercent / 100))
    }, 0)
    const grandTotal = subtotal - totalDiscount + totalTax

    return { subtotal, totalDiscount, totalTax, grandTotal }
  }

  function updateLineItem(index: number, field: keyof LineItemFormData, value: any) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  function addLineItem() {
    const updated = [...lineItems, createEmptyLineItem()]
    setLineItems(updated)
  }

  function removeLineItem(index: number) {
    if (lineItems.length === 1) return // Keep at least one line
    const updated = lineItems.filter((_, i) => i !== index)
    setLineItems(updated)
  }

  // Notify parent of changes
  useEffect(() => {
    const cleanedItems: LineItemFormData[] = lineItems.map(({ tempId, ...item }) => item)
    const totals = calculateTotals()
    onChange(cleanedItems, totals)
  }, [lineItems, onChange])

  const totals = calculateTotals()
  const hasDiscount = lineItems.some(item => item.discountPercent > 0)
  const hasTax = lineItems.some(item => item.taxPercent > 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px]">Description</TableHead>
              <TableHead className="w-[100px]">Qty</TableHead>
              <TableHead className="w-[120px]">Unit Price</TableHead>
              <TableHead className="w-[100px]">Disc %</TableHead>
              <TableHead className="w-[100px]">Tax %</TableHead>
              <TableHead className="w-[130px] text-right">Line Total</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item, index) => (
              <TableRow key={item.tempId}>
                <TableCell>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Item description"
                    className="min-w-[230px]"
                    required
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-[90px]"
                    required
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-[110px]"
                    required
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.discountPercent}
                    onChange={(e) => updateLineItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                    className="w-[90px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.taxPercent}
                    onChange={(e) => updateLineItem(index, 'taxPercent', parseFloat(e.target.value) || 0)}
                    className="w-[90px]"
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(calculateLineTotal(item))}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button type="button" variant="outline" onClick={addLineItem} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Line Item
      </Button>

      {/* Totals Summary */}
      <div className="rounded-lg border bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono font-semibold">{formatCurrency(totals.subtotal)}</span>
        </div>
        {hasDiscount && totals.totalDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-500">
            <span>Total Discount</span>
            <span className="font-mono">-{formatCurrency(totals.totalDiscount)}</span>
          </div>
        )}
        {hasTax && totals.totalTax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Tax</span>
            <span className="font-mono">{formatCurrency(totals.totalTax)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t pt-2 bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
          <span>Grand Total</span>
          <span className="font-mono">{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}
