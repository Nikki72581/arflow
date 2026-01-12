'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, CheckCircle2 } from 'lucide-react'
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
import { updateDocument } from '@/app/actions/documents'
import { getEnabledPaymentTermTypes } from '@/app/actions/payment-term-types'
import { DocumentStatus } from '@prisma/client'

interface EditDocumentDialogProps {
  document: any
  trigger?: React.ReactNode
}

export function EditDocumentDialog({
  document,
  trigger,
}: EditDocumentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [paymentTerms, setPaymentTerms] = useState<any[]>([])
  const [selectedPaymentTermId, setSelectedPaymentTermId] = useState<string>(document.paymentTermId || '')
  const [documentDate, setDocumentDate] = useState<string>(
    new Date(document.documentDate).toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState<string>(
    document.dueDate ? new Date(document.dueDate).toISOString().split('T')[0] : ''
  )
  const [dueDateManuallySet, setDueDateManuallySet] = useState(!!document.dueDate)
  const [paymentTermInfo, setPaymentTermInfo] = useState<any>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Load payment terms when dialog opens
  useEffect(() => {
    if (open) {
      getEnabledPaymentTermTypes().then((terms) => {
        setPaymentTerms(terms)
      })
    }
  }, [open])

  // Calculate due date when payment term or document date changes
  useEffect(() => {
    if (documentDate && selectedPaymentTermId) {
      const term = paymentTerms.find(t => t.id === selectedPaymentTermId)

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
    }
  }, [documentDate, selectedPaymentTermId, paymentTerms, dueDateManuallySet])

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

    const data = {
      documentNumber: getString('documentNumber') || document.documentNumber,
      referenceNumber: getString('referenceNumber'),
      documentDate: new Date(documentDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: getString('notes'),
      customerNotes: getString('customerNotes'),
      status: getString('status') as DocumentStatus,
      paymentTermId: selectedPaymentTermId || undefined,
    }

    try {
      await updateDocument(document.id, data)

      // Show success animation
      setShowSuccess(true)

      // Wait for animation, then close and refresh
      setTimeout(() => {
        setShowSuccess(false)
        setOpen(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
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
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[760px]">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-in zoom-in duration-500">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <p className="mt-4 text-lg font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700">
              Success!
            </p>
            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Document updated successfully
            </p>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
              <DialogDescription>
                Update document information for {document.documentNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="documentNumber">Document number</Label>
                    <Input
                      id="documentNumber"
                      name="documentNumber"
                      defaultValue={document.documentNumber}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referenceNumber">Reference number</Label>
                    <Input
                      id="referenceNumber"
                      name="referenceNumber"
                      defaultValue={document.referenceNumber || ''}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={document.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="VOID">Void</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Date & Payment Terms */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Date & Payment Terms
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="documentDate">Document date</Label>
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
                        setDueDateManuallySet(false)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Payment Terms: {paymentTermInfo.term.name}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Due date calculated as {paymentTermInfo.term.daysDue} days from document date
                    </p>
                    {paymentTermInfo.term.hasDiscount && (
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {paymentTermInfo.term.discountPercentage}% early payment discount available if paid within {paymentTermInfo.term.discountDays} days
                      </p>
                    )}
                    {dueDateManuallySet && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Due date has been manually adjusted
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Notes
                </h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Internal notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={document.notes || ''}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="customerNotes">Customer notes</Label>
                    <Textarea
                      id="customerNotes"
                      name="customerNotes"
                      defaultValue={document.customerNotes || ''}
                      rows={3}
                    />
                  </div>
                </div>
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
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
