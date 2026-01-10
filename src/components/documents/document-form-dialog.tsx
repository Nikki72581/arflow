'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, CheckCircle2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { createDocument } from '@/app/actions/documents'
import { getClients } from '@/app/actions/clients'
import { getEnabledPaymentTermTypes } from '@/app/actions/payment-term-types'
import { DocumentType } from '@prisma/client'

interface DocumentFormDialogProps {
  trigger?: React.ReactNode
  defaultOpen?: boolean
}

export function DocumentFormDialog({
  trigger,
  defaultOpen = false,
}: DocumentFormDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [documentType, setDocumentType] = useState<DocumentType>('INVOICE')
  const [customerId, setCustomerId] = useState<string>('')
  const [documentDate, setDocumentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>('')
  const [dueDateManuallySet, setDueDateManuallySet] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [paymentTermInfo, setPaymentTermInfo] = useState<any>(null)
  const [paymentTerms, setPaymentTerms] = useState<any[]>([])
  const [selectedPaymentTermId, setSelectedPaymentTermId] = useState<string>('')
  const formRef = useRef<HTMLFormElement>(null)

  // Load clients and payment terms when dialog opens
  useEffect(() => {
    if (open) {
      getClients().then((result) => {
        if (result.success && result.data) {
          setClients(result.data)
        }
      })
      getEnabledPaymentTermTypes().then((terms) => {
        setPaymentTerms(terms)
      })
    }
  }, [open])

  // Calculate due date when customer, payment term, or document date changes
  useEffect(() => {
    if (customerId && documentDate) {
      const customer = clients.find(c => c.id === customerId)
      setSelectedCustomer(customer)

      // Determine which payment term to use
      let term = null

      // If a payment term is explicitly selected, use that
      if (selectedPaymentTermId) {
        term = paymentTerms.find(t => t.id === selectedPaymentTermId)
      }
      // Otherwise, use customer's default payment term
      else if (customer?.paymentTerm) {
        term = customer.paymentTerm
        // Auto-select the customer's payment term
        setSelectedPaymentTermId(customer.paymentTermId || '')
      }

      if (term) {
        // Calculate projected due date
        const docDate = new Date(documentDate)
        const projectedDueDate = new Date(docDate)
        projectedDueDate.setDate(projectedDueDate.getDate() + term.daysDue)

        setPaymentTermInfo({
          term: term,
          projectedDueDate: projectedDueDate.toISOString().split('T')[0]
        })

        // Auto-set due date if not manually set
        if (!dueDateManuallySet) {
          setDueDate(projectedDueDate.toISOString().split('T')[0])
        }
      } else {
        setPaymentTermInfo(null)
      }
    } else {
      setPaymentTermInfo(null)
      setSelectedCustomer(null)
    }
  }, [customerId, documentDate, selectedPaymentTermId, clients, paymentTerms, dueDateManuallySet])

  // Reset form when dialog closes
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset form state
      formRef.current?.reset()
      setDocumentType('INVOICE')
      setCustomerId('')
      setDocumentDate(new Date().toISOString().split('T')[0])
      setDueDate('')
      setDueDateManuallySet(false)
      setSelectedCustomer(null)
      setPaymentTermInfo(null)
      setSelectedPaymentTermId('')
      setError(null)
      setShowSuccess(false)
    }
  }

  // Handle due date changes to track manual edits
  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate)
    setDueDateManuallySet(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const getString = (key: string) => {
      const value = formData.get(key)
      if (typeof value !== 'string') return undefined
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    }

    const getNumber = (key: string) => {
      const value = getString(key)
      if (!value) return undefined
      const num = Number(value)
      return Number.isFinite(num) ? num : undefined
    }

    const subtotal = getNumber('subtotal') || 0
    const taxAmount = getNumber('taxAmount') || 0
    const totalAmount = subtotal + taxAmount

    const data = {
      customerId,
      documentType,
      documentNumber: getString('documentNumber') || '',
      referenceNumber: getString('referenceNumber'),
      documentDate: new Date(documentDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      subtotal,
      taxAmount,
      totalAmount,
      description: getString('description'),
      notes: getString('notes'),
      customerNotes: getString('customerNotes'),
      paymentTermId: selectedPaymentTermId || undefined,
    }

    try {
      const result = await createDocument(data)

      if (result.success) {
        // Show success animation
        setShowSuccess(true)

        // Wait for animation, then close and refresh
        setTimeout(() => {
          setShowSuccess(false)
          setOpen(false)
          // Preserve existing URL params and add refresh timestamp to trigger re-fetch
          const currentParams = new URLSearchParams(searchParams.toString())
          currentParams.set('_refresh', Date.now().toString())
          router.push(`/dashboard/documents?${currentParams.toString()}`)
          router.refresh()
        }, 1500)
      } else {
        setError(result.error || 'Failed to create document')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button data-testid="new-document-button">
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[760px]" data-testid="document-form-dialog">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12" data-testid="success-message">
            <div className="animate-in zoom-in duration-500">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <p className="mt-4 text-lg font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700">
              Success!
            </p>
            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Document created successfully
            </p>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Add a new document to your organization.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="documentType">
                      Document type <span className="text-destructive">*</span>
                    </Label>
                    <Select value={documentType} onValueChange={(value: DocumentType) => setDocumentType(value)}>
                      <SelectTrigger data-testid="document-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVOICE">Invoice</SelectItem>
                        <SelectItem value="QUOTE">Quote</SelectItem>
                        <SelectItem value="ORDER">Order</SelectItem>
                        <SelectItem value="CREDIT_MEMO">Credit memo</SelectItem>
                        <SelectItem value="DEBIT_MEMO">Debit memo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="customerId">
                      Customer <span className="text-destructive">*</span>
                    </Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger data-testid="customer-select">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="documentNumber">
                      Document number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="documentNumber"
                      name="documentNumber"
                      data-testid="document-number-input"
                      placeholder="INV-001"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referenceNumber">Reference number</Label>
                    <Input
                      id="referenceNumber"
                      name="referenceNumber"
                      placeholder="PO-12345"
                    />
                  </div>
                </div>
              </div>

              {/* Date Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Date & Payment Terms
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="documentDate">
                      Document date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="documentDate"
                      type="date"
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="paymentTermId">Payment terms</Label>
                    <Select
                      value={selectedPaymentTermId}
                      onValueChange={(value) => {
                        setSelectedPaymentTermId(value)
                        setDueDateManuallySet(false) // Allow recalculation
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTerms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Due date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Payment Term Information */}
                {paymentTermInfo && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 mt-4">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Payment Terms: {paymentTermInfo.term.name}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Due date calculated as {paymentTermInfo.term.daysDue} days from document date
                    </p>
                    {paymentTermInfo.term.hasDiscount && (
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        💰 {paymentTermInfo.term.discountPercentage}% early payment discount available if paid within {paymentTermInfo.term.discountDays} days
                      </p>
                    )}
                    {dueDateManuallySet && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        ⚠️ Due date has been manually adjusted
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Financial Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Financial Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="subtotal">
                      Subtotal <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="subtotal"
                      name="subtotal"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0.00"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="taxAmount">Tax amount</Label>
                    <Input
                      id="taxAmount"
                      name="taxAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0.00"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="totalAmount">Total amount</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      disabled
                      value={
                        (Number(document.getElementById('subtotal')?.getAttribute('value') || 0) +
                        Number(document.getElementById('taxAmount')?.getAttribute('value') || 0)).toFixed(2)
                      }
                      placeholder="0.00"
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Description and Notes - Collapsed */}
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="description">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Description & Notes
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 pt-4">
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Line item description or summary..."
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="notes">Internal notes</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          placeholder="Internal notes (not visible to customer)..."
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="customerNotes">Customer notes</Label>
                        <Textarea
                          id="customerNotes"
                          name="customerNotes"
                          placeholder="Notes visible to customer on portal..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
              <Button type="submit" disabled={loading || !customerId} data-testid="submit-document-button">
                {loading ? 'Creating...' : 'Create Document'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
