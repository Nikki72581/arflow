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
import { createClient, updateClient } from '@/app/actions/clients'
import type { Client } from '@/lib/types'

interface Territory {
  id: string
  name: string
}

interface ClientFormDialogProps {
  client?: Client
  territories?: Territory[]
  trigger?: React.ReactNode
  defaultOpen?: boolean
}

export function ClientFormDialog({
  client,
  territories = [],
  trigger,
  defaultOpen = false,
}: ClientFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [tier, setTier] = useState<'STANDARD' | 'VIP' | 'NEW' | 'ENTERPRISE'>(
    (client as any)?.tier || 'STANDARD'
  )
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'PROSPECTIVE' | 'CHURNED'>(
    (client as any)?.status || 'ACTIVE'
  )
  const [territoryId, setTerritoryId] = useState((client as any)?.territoryId || '')

  const isEdit = !!client

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      notes: formData.get('notes') as string,
      tier,
      status,
      clientId: formData.get('clientId') as string,
      territoryId: territoryId || undefined,
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

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive sm:col-span-2">
                {error}
              </div>
            )}

            {isEdit && (client as any)?.externalSystem && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm sm:col-span-2">
                <p className="font-medium text-blue-900 dark:text-blue-100">Integration Source</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                  This client was created from {(client as any).externalSystem} (ID: {(client as any).externalId})
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                data-testid="client-name-input"
                defaultValue={client?.name}
                placeholder="Acme Corporation"
                required
              />
              {error && error.includes('name') && (
                <p className="text-sm text-destructive" data-testid="client-name-error">Name is required</p>
              )}
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
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                data-testid="client-address-input"
                defaultValue={client?.address || ''}
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                name="clientId"
                defaultValue={(client as any)?.clientId || ''}
                placeholder="External system client ID"
              />
              <p className="text-xs text-muted-foreground">
                External client ID for integrations
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tier">Customer Tier</Label>
              <Select value={tier} onValueChange={(value: 'STANDARD' | 'VIP' | 'NEW' | 'ENTERPRISE') => setTier(value)}>
                <SelectTrigger data-testid="client-tier-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD" data-testid="client-tier-standard">Standard</SelectItem>
                  <SelectItem value="VIP" data-testid="client-tier-vip">VIP</SelectItem>
                  <SelectItem value="NEW" data-testid="client-tier-new">New Customer</SelectItem>
                  <SelectItem value="ENTERPRISE" data-testid="client-tier-enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Customer tier for tier-based commission rules
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'PROSPECTIVE' | 'CHURNED') => setStatus(value)}>
                <SelectTrigger data-testid="client-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE" data-testid="client-status-active">Active</SelectItem>
                  <SelectItem value="INACTIVE" data-testid="client-status-inactive">Inactive</SelectItem>
                  <SelectItem value="PROSPECTIVE" data-testid="client-status-prospective">Prospective</SelectItem>
                  <SelectItem value="CHURNED" data-testid="client-status-churned">Churned</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current status of the client relationship
              </p>
            </div>

            {territories.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="territoryId">Territory</Label>
                <Select value={territoryId || 'none'} onValueChange={(value) => setTerritoryId(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No territory</SelectItem>
                    {territories.map((territory) => (
                      <SelectItem key={territory.id} value={territory.id}>
                        {territory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2 sm:col-span-2">
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
