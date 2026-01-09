'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { updateUserFields } from '@/app/actions/users'
import { toast } from 'sonner'

interface EditUserDialogProps {
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    employeeId?: string | null
    salespersonId?: string | null
  }
}

export function EditUserDialog({ user }: EditUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState(user.employeeId || '')
  const [salespersonId, setSalespersonId] = useState(user.salespersonId || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await updateUserFields(user.id, {
        employeeId: employeeId.trim() || undefined,
        salespersonId: salespersonId.trim() || undefined,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to update user')
        return
      }

      toast.success('User updated successfully')
      setOpen(false)
    } catch (error) {
      toast.error('An error occurred while updating user')
    } finally {
      setLoading(false)
    }
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit user</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update external system IDs for {fullName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              placeholder="Employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Employee ID from your external HR or payroll system
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="salespersonId">Salesperson ID</Label>
            <Input
              id="salespersonId"
              placeholder="Salesperson ID"
              value={salespersonId}
              onChange={(e) => setSalespersonId(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Salesperson ID from your external CRM or sales system
            </p>
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
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
