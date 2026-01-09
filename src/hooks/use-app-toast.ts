import { useToast } from '@/hooks/use-toast'

/**
 * Toast Notification Utilities
 * Provides consistent toast messages throughout the app
 */

export function useAppToast() {
  const { toast } = useToast()

  return {
    // Success toasts
    success: (title: string, description?: string) => {
      toast({
        title,
        description,
      })
    },

    // Error toasts
    error: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: 'destructive',
      })
    },

    // Info toasts
    info: (title: string, description?: string) => {
      toast({
        title,
        description,
      })
    },

    // Common success messages
    saved: () => {
      toast({
        title: 'Saved successfully',
        description: 'Your changes have been saved.',
      })
    },

    deleted: (itemName?: string) => {
      toast({
        title: 'Deleted successfully',
        description: itemName ? `${itemName} has been deleted.` : 'The item has been deleted.',
      })
    },

    created: (itemName?: string) => {
      toast({
        title: 'Created successfully',
        description: itemName ? `${itemName} has been created.` : 'The item has been created.',
      })
    },

    updated: (itemName?: string) => {
      toast({
        title: 'Updated successfully',
        description: itemName ? `${itemName} has been updated.` : 'The item has been updated.',
      })
    },

    // Common error messages
    saveFailed: (error?: string) => {
      toast({
        title: 'Failed to save',
        description: error || 'There was an error saving your changes. Please try again.',
        variant: 'destructive',
      })
    },

    deleteFailed: (error?: string) => {
      toast({
        title: 'Failed to delete',
        description: error || 'There was an error deleting the item. Please try again.',
        variant: 'destructive',
      })
    },

    loadFailed: (error?: string) => {
      toast({
        title: 'Failed to load',
        description: error || 'There was an error loading the data. Please try again.',
        variant: 'destructive',
      })
    },

    // Commission-specific toasts
    commissionApproved: () => {
      toast({
        title: 'Commission approved',
        description: 'The commission has been approved successfully.',
      })
    },

    commissionPaid: () => {
      toast({
        title: 'Commission paid',
        description: 'The commission has been marked as paid.',
      })
    },

    bulkPayoutProcessed: (count: number, total: string) => {
      toast({
        title: 'Bulk payout processed',
        description: `${count} commissions totaling ${total} have been paid.`,
      })
    },

    exportSuccess: (count: number) => {
      toast({
        title: 'Export successful',
        description: `Exported ${count} records to CSV.`,
      })
    },

    exportFailed: () => {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the data. Please try again.',
        variant: 'destructive',
      })
    },

    // Notification toasts
    notificationSent: () => {
      toast({
        title: 'Notification sent',
        description: 'Email notification has been sent successfully.',
      })
    },

    notificationFailed: () => {
      toast({
        title: 'Notification failed',
        description: 'Failed to send email notification.',
        variant: 'destructive',
      })
    },

    // Permission toasts
    unauthorized: () => {
      toast({
        title: 'Unauthorized',
        description: 'You do not have permission to perform this action.',
        variant: 'destructive',
      })
    },

    // Network toasts
    networkError: () => {
      toast({
        title: 'Network error',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      })
    },

    // Validation toasts
    validationError: (message: string) => {
      toast({
        title: 'Validation error',
        description: message,
        variant: 'destructive',
      })
    },

    // Copy to clipboard
    copied: () => {
      toast({
        title: 'Copied to clipboard',
      })
    },
  }
}

/**
 * Example usage:
 * 
 * const toast = useAppToast()
 * 
 * // Simple success
 * toast.success('Done!')
 * 
 * // Common actions
 * toast.saved()
 * toast.deleted('Commission Plan')
 * toast.created('New Sale')
 * 
 * // Commission-specific
 * toast.commissionApproved()
 * toast.bulkPayoutProcessed(15, '$12,345.67')
 * 
 * // Errors
 * toast.saveFailed('Invalid commission amount')
 * toast.networkError()
 */
