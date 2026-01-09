'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { createClient, updateClient } from '@/app/actions/clients'
import type { Customer } from '@/lib/types'

interface ClientFormDialogProps {
  client?: Customer
  trigger?: React.ReactNode
  defaultOpen?: boolean
}

export function ClientFormDialog({
  client,
  trigger,
  defaultOpen = false,
}: ClientFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'COLLECTIONS'>(
    client?.status || 'ACTIVE'
  )

  const isEdit = !!client

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
    const creditLimitValue = getString('creditLimit')
    const creditLimit = creditLimitValue ? Number(creditLimitValue) : undefined
    const data = {
      companyName: getString('companyName') || '',
      contactName: getString('contactName'),
      email: getString('email'),
      phone: getString('phone'),
      website: getString('website'),
      customerNumber: getString('customerNumber'),
      paymentTerms: getString('paymentTerms'),
      creditLimit: Number.isFinite(creditLimit) ? creditLimit : undefined,
      billingAddress1: getString('billingAddress1'),
      billingCity: getString('billingCity'),
      billingState: getString('billingState'),
      billingZip: getString('billingZip'),
      billingCountry: getString('billingCountry'),
      shippingAddress1: getString('shippingAddress1'),
      shippingCity: getString('shippingCity'),
      shippingState: getString('shippingState'),
      shippingZip: getString('shippingZip'),
      shippingCountry: getString('shippingCountry'),
      notes: getString('notes'),
      status,
    }

    try {
      const result = isEdit
        ? await updateClient(client.id, data)
        : await createClient(data)

      if (result.success) {
        // Show success animation
        setShowSuccess(true)

        // Wait for animation, then close and refresh
        setTimeout(() => {
          setShowSuccess(false)
          setOpen(false)
          router.refresh()
        }, 1500)
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
          <Button data-testid="new-client-button">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[760px]" data-testid="client-form-dialog">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12" data-testid="success-message">
            <div className="animate-in zoom-in duration-500">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <p className="mt-4 text-lg font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700">
              Success!
            </p>
            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Client {isEdit ? 'updated' : 'created'} successfully
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit Client' : 'New Client'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Update the client information below.'
                  : 'Add a new client to your organization.'}
              </DialogDescription>
            </DialogHeader>

          <div className="grid gap-6 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {isEdit && client?.externalSystem && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Integration Source</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                  This client was created from {client.externalSystem}
                  {client.externalId ? ` (ID: ${client.externalId})` : ''}
                </p>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="companyName">
                    Company name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    data-testid="client-name-input"
                    defaultValue={client?.companyName}
                    placeholder="Acme Corporation"
                    required
                  />
                  {error && error.includes('companyName') && (
                    <p className="text-sm text-destructive" data-testid="client-name-error">Company name is required</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="customerNumber">Customer number</Label>
                  <Input
                    id="customerNumber"
                    name="customerNumber"
                    defaultValue={client?.customerNumber || ''}
                    placeholder="CUST-1001"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'COLLECTIONS') => setStatus(value)}>
                    <SelectTrigger data-testid="client-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE" data-testid="client-status-active">Active</SelectItem>
                      <SelectItem value="INACTIVE" data-testid="client-status-inactive">Inactive</SelectItem>
                      <SelectItem value="ON_HOLD" data-testid="client-status-on-hold">On hold</SelectItem>
                      <SelectItem value="COLLECTIONS" data-testid="client-status-collections">Collections</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="contactName">Primary contact</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    defaultValue={client?.contactName || ''}
                    placeholder="Alex Johnson"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    data-testid="client-email-input"
                    defaultValue={client?.email || ''}
                    placeholder="contact@acme.com"
                  />
                  {error && error.includes('email') && (
                    <p className="text-sm text-destructive" data-testid="client-email-error">Please enter a valid email</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    data-testid="client-phone-input"
                    defaultValue={client?.phone || ''}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    defaultValue={client?.website || ''}
                    placeholder="https://acme.com"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Financial Settings
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="paymentTerms">Payment terms</Label>
                  <Input
                    id="paymentTerms"
                    name="paymentTerms"
                    defaultValue={client?.paymentTerms || ''}
                    placeholder="Net 30"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="creditLimit">Credit limit</Label>
                  <Input
                    id="creditLimit"
                    name="creditLimit"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={client?.creditLimit ?? ''}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Address Sections */}
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="billing">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  Billing Address
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 sm:grid-cols-2 pt-4">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="billingAddress1">Street address</Label>
                      <Input
                        id="billingAddress1"
                        name="billingAddress1"
                        defaultValue={client?.billingAddress1 || ''}
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="billingCity">City</Label>
                      <Input
                        id="billingCity"
                        name="billingCity"
                        defaultValue={client?.billingCity || ''}
                        placeholder="Austin"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="billingState">State/Province</Label>
                      <Input
                        id="billingState"
                        name="billingState"
                        defaultValue={client?.billingState || ''}
                        placeholder="TX"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="billingZip">ZIP/Postal code</Label>
                      <Input
                        id="billingZip"
                        name="billingZip"
                        defaultValue={client?.billingZip || ''}
                        placeholder="78701"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="billingCountry">Country</Label>
                      <Input
                        id="billingCountry"
                        name="billingCountry"
                        defaultValue={client?.billingCountry || ''}
                        placeholder="USA"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="shipping">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  Shipping Address
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 sm:grid-cols-2 pt-4">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="shippingAddress1">Street address</Label>
                      <Input
                        id="shippingAddress1"
                        name="shippingAddress1"
                        defaultValue={client?.shippingAddress1 || ''}
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="shippingCity">City</Label>
                      <Input
                        id="shippingCity"
                        name="shippingCity"
                        defaultValue={client?.shippingCity || ''}
                        placeholder="Austin"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="shippingState">State/Province</Label>
                      <Input
                        id="shippingState"
                        name="shippingState"
                        defaultValue={client?.shippingState || ''}
                        placeholder="TX"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="shippingZip">ZIP/Postal code</Label>
                      <Input
                        id="shippingZip"
                        name="shippingZip"
                        defaultValue={client?.shippingZip || ''}
                        placeholder="78701"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="shippingCountry">Country</Label>
                      <Input
                        id="shippingCountry"
                        name="shippingCountry"
                        defaultValue={client?.shippingCountry || ''}
                        placeholder="USA"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Additional Notes
              </h3>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={client?.notes || ''}
                  placeholder="Additional notes about this client..."
                  rows={3}
                />
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
            <Button type="submit" disabled={loading} data-testid="submit-client-button">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
