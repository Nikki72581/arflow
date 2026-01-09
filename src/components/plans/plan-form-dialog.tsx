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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCommissionPlan, updateCommissionPlan } from '@/app/actions/commission-plans'

interface CommissionPlan {
  id: string
  name: string
  description?: string | null
  projectId?: string | null
  commissionBasis?: 'GROSS_REVENUE' | 'NET_SALES'
  isActive: boolean
}

interface Project {
  id: string
  name: string
  client: {
    name: string
  }
}

interface CommissionPlanFormDialogProps {
  plan?: CommissionPlan
  projects?: Project[]
  trigger?: React.ReactNode
  defaultOpen?: boolean
}

export function CommissionPlanFormDialog({
  plan,
  projects = [],
  trigger,
  defaultOpen = false,
}: CommissionPlanFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState(plan?.projectId || '')
  const [commissionBasis, setCommissionBasis] = useState<'GROSS_REVENUE' | 'NET_SALES'>(
    plan?.commissionBasis || 'GROSS_REVENUE'
  )
  const [isActive, setIsActive] = useState(plan?.isActive ?? true)

  const isEdit = !!plan

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      projectId: selectedProjectId || undefined,
      commissionBasis,
      isActive,
    }

    try {
      const result = isEdit
        ? await updateCommissionPlan(plan.id, data)
        : await createCommissionPlan(data)

      if (result.success) {
        setOpen(false)
        if (!isEdit && result.data?.id) {
          // Navigate to the newly created plan's detail view
          router.push(`/dashboard/plans/${result.data.id}`)
        } else {
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
          <Button data-testid="new-plan-button">
            <Plus className="mr-2 h-4 w-4" />
            New Commission Plan
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]" data-testid="plan-form-dialog">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Edit Commission Plan' : 'New Commission Plan'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the commission plan details.'
                : 'Create a new commission plan and add rules to define how commissions are calculated.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">
                Plan Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={plan?.name}
                placeholder="Standard Sales Commission"
                required
                data-testid="plan-name-input"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={plan?.description || ''}
                placeholder="Describe when this plan applies..."
                rows={3}
                data-testid="plan-description-input"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="commissionBasis">
                Commission Basis <span className="text-destructive">*</span>
              </Label>
              <Select value={commissionBasis} onValueChange={(value: 'GROSS_REVENUE' | 'NET_SALES') => setCommissionBasis(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROSS_REVENUE">
                    Gross Revenue (Full Invoice Amount)
                  </SelectItem>
                  <SelectItem value="NET_SALES">
                    Net Sales (After Returns/Credits)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose what amount to calculate commission on
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectId">Attach to Project</Label>
              <Select value={selectedProjectId || 'none'} onValueChange={(value) => setSelectedProjectId(value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project (general plan)</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.client.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Attach this plan to a specific project if needed.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Plan is active
              </Label>
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
            <Button type="submit" disabled={loading} data-testid="submit-plan-button">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
