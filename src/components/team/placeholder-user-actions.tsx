'use client'

import { useState } from 'react'
import { Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { invitePlaceholderUser, deletePlaceholderUser } from '@/app/actions/users'
import { toast } from 'sonner'

interface PlaceholderUserActionsProps {
  userId: string
  userEmail: string
  userName: string
  invitedAt: Date | null
}

export function PlaceholderUserActions({
  userId,
  userEmail,
  userName,
  invitedAt
}: PlaceholderUserActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleInvite = async () => {
    setLoading(true)
    try {
      const result = await invitePlaceholderUser(userId)

      if (!result.success) {
        toast.error(result.error || 'Failed to send invitation')
        return
      }

      toast.success(`Invitation sent to ${userEmail}`)
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Invite error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const result = await deletePlaceholderUser(userId)

      if (!result.success) {
        toast.error(result.error || 'Failed to delete user')
        return
      }

      toast.success(`Deleted placeholder user ${userEmail}`)
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Delete error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!invitedAt ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleInvite}
            disabled={loading}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Send Invite
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Placeholder User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {userName || userEmail}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">Invitation sent</span>
      )}
    </div>
  )
}
