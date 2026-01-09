'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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
import { createSalesTransaction, updateSalesTransaction } from '@/app/actions/sales-transactions'
import { QuickClientCreateDialog } from '@/components/clients/quick-client-create-dialog'

interface SalesTransaction {
  id: string
  amount: number
  transactionDate: Date
  transactionType?: 'SALE' | 'RETURN' | 'ADJUSTMENT'
  parentTransactionId?: string | null
  productCategoryId?: string | null
  invoiceNumber?: string | null
  description?: string | null
  projectId: string | null
  userId: string
}

interface Project {
  id: string
  name: string
  client: {
    id: string
    name: string
  }
}

interface Client {
  id: string
  name: string
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface ProductCategory {
  id: string
  name: string
}

interface SalesTransactionFormDialogProps {
  transaction?: SalesTransaction
  projects: Project[]
  clients?: Client[]
  users: User[]
  productCategories?: ProductCategory[]
  requireProjects?: boolean
  trigger?: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SalesTransactionFormDialog({
  transaction,
  projects,
  clients = [],
  users,
  productCategories = [],
  requireProjects = false,
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: SalesTransactionFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(transaction?.projectId || null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState(transaction?.userId || '')
  const [transactionType, setTransactionType] = useState<'SALE' | 'RETURN' | 'ADJUSTMENT'>(
    transaction?.transactionType || 'SALE'
  )
  const [productCategoryId, setProductCategoryId] = useState(transaction?.productCategoryId || '')
  const [dynamicClients, setDynamicClients] = useState<Client[]>([])

  const isEdit = !!transaction

  // Combine original clients with dynamically created ones
  const allClients = [...clients, ...dynamicClients]

  // Handler for when a new client is created
  const handleClientCreated = (newClient: { id: string; name: string }) => {
    setDynamicClients(prev => [...prev, newClient])
    setSelectedClientId(newClient.id)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      amount: parseFloat(formData.get('amount') as string),
      transactionDate: formData.get('transactionDate') as string,
      transactionType,
      productCategoryId: productCategoryId || undefined,
      invoiceNumber: formData.get('invoiceNumber') as string || undefined,
      description: formData.get('description') as string,
      projectId: selectedProjectId ?? undefined,
      clientId: selectedClientId ?? undefined,
      userId: selectedUserId,
    }

    // Validate required fields
    if (requireProjects && !data.projectId) {
      setError('Project is required. Please select a project.')
      setLoading(false)
      return
    }

    if (!requireProjects && !data.projectId && !data.clientId) {
      setError('Please select either a project or a client. If no project is needed, scroll down to select a client.')
      setLoading(false)
      return
    }

    if (!data.userId) {
      setError('Salesperson is required. Please select a salesperson.')
      setLoading(false)
      return
    }

    try {
      const result = isEdit
        ? await updateSalesTransaction(transaction.id, data)
        : await createSalesTransaction(data)

      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error || 'Something went wrong')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }
  const todayInput = formatDateForInput(new Date())

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}
      {!trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {isEdit ? 'Edit Sale' : 'New Sale'}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Sale' : 'Record New Sale'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the sale details below. Any changes will trigger commission recalculation.'
                : 'Enter sale details. Commission will be calculated automatically based on matching commission plans.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">
                  Sale Amount <span className="text-destructive">*</span>
                </Label>
                <NumberInput
                  id="amount"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  defaultValue={transaction?.amount ?? '0.00'}
                  placeholder="10000.00"
                  startAdornment="$"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transactionDate">
                  Sale Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="transactionDate"
                  name="transactionDate"
                  type="date"
                  defaultValue={
                    transaction ? formatDateForInput(transaction.transactionDate) : todayInput
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="transactionType">
                  Transaction Type <span className="text-destructive">*</span>
                </Label>
                <Select value={transactionType} onValueChange={(value: 'SALE' | 'RETURN' | 'ADJUSTMENT') => setTransactionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="RETURN">Return/Credit</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  type="text"
                  defaultValue={transaction?.invoiceNumber || ''}
                  placeholder="INV-12345"
                />
              </div>
            </div>

            {productCategories.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="productCategoryId">Product Category</Label>
                <Select value={productCategoryId || 'none'} onValueChange={(value) => setProductCategoryId(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {productCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Project Selector - Conditionally Required */}
            {projects.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="projectId">
                  Project {requireProjects && <span className="text-destructive">*</span>}
                </Label>
                {!requireProjects && (
                  <p className="text-xs text-muted-foreground">
                    Select a project or client below.
                  </p>
                )}
                <Select value={selectedProjectId ?? 'none'} onValueChange={(value) => {
                  const newProjectId = value === 'none' ? null : value
                  setSelectedProjectId(newProjectId)
                  // Auto-select client from project if available
                  if (newProjectId && projects.length > 0) {
                    const project = projects.find(p => p.id === newProjectId)
                    if (project) {
                      setSelectedClientId(project.client.id)
                    }
                  } else if (!newProjectId) {
                    // Clear client when project is cleared (unless projects are optional)
                    if (requireProjects) {
                      setSelectedClientId(null)
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {!requireProjects && (
                      <SelectItem value="none">No project</SelectItem>
                    )}
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.client.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Client Selector - Only show when projects are optional and no project selected */}
            {!requireProjects && !selectedProjectId && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clientId">
                    Client <span className="text-destructive">*</span>
                    <span className="text-muted-foreground text-xs ml-1">(required when no project selected)</span>
                  </Label>
                  <QuickClientCreateDialog onClientCreated={handleClientCreated} />
                </div>
                <Select value={selectedClientId ?? 'none'} onValueChange={(value) => {
                  setSelectedClientId(value === 'none' ? null : value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a client...</SelectItem>
                    {allClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="userId">
                Salesperson <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={transaction?.description || ''}
                placeholder="Add any notes about this sale..."
                rows={3}
              />
            </div>

            {!isEdit && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Automatic Commission Calculation</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  {requireProjects
                    ? "Commission will be calculated automatically using the project's commission plan."
                    : "The system will automatically find and apply the best matching commission plan (project, client, or organization-wide)."}
                </p>
              </div>
            )}
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
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
