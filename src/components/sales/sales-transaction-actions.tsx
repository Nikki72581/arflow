'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteSalesTransaction } from '@/app/actions/sales-transactions'
import { SalesTransactionFormDialog } from './sales-transaction-form-dialog'
import { toast } from 'sonner'

interface CommissionCalculation {
  id: string
  status: 'PENDING' | 'CALCULATED' | 'APPROVED' | 'PAID'
}

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
  commissionCalculations: CommissionCalculation[]
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

interface SalesTransactionActionsProps {
  transaction: SalesTransaction
  projects: Project[]
  clients: Client[]
  users: User[]
  productCategories: ProductCategory[]
  requireProjects: boolean
}

export function SalesTransactionActions({
  transaction,
  projects,
  clients,
  users,
  productCategories,
  requireProjects,
}: SalesTransactionActionsProps) {
  const router = useRouter()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Check if transaction can be edited or deleted
  const hasCommission = transaction.commissionCalculations.length > 0
  const hasPaidCommission = transaction.commissionCalculations.some(
    (calc) => calc.status === 'PAID'
  )

  // Can edit/delete if: no commission plan applied OR commission is still pending
  const canEdit = !hasCommission || !hasPaidCommission
  const canDelete = !hasCommission || !hasPaidCommission

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteSalesTransaction(transaction.id)

      if (result.success) {
        toast.success('Sales transaction deleted successfully')
        router.refresh()
        setIsDeleteDialogOpen(false)
      } else {
        toast.error(result.error || 'Failed to delete sales transaction')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canEdit && (
        <SalesTransactionFormDialog
          transaction={transaction}
          projects={projects}
          clients={clients}
          users={users}
          productCategories={productCategories}
          requireProjects={requireProjects}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sales transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
