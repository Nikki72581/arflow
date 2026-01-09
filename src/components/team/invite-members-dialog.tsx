'use client'

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { inviteTeamMembers } from '@/app/actions/users'
import { toast } from 'sonner'

export function InviteMembersDialog() {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)

  const addEmailField = () => {
    setEmails([...emails, ''])
  }

  const removeEmailField = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index))
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const handleInvite = async () => {
    const validEmails = emails.filter(e => e.trim().length > 0)

    if (validEmails.length === 0) {
      toast.error('Please enter at least one email address')
      return
    }

    setLoading(true)
    try {
      const result = await inviteTeamMembers(validEmails)

      if (!result.success) {
        toast.error(result.error || 'Failed to send invitations')
        return
      }

      toast.success(`Successfully invited ${result.data?.invitationCount} team member(s)`)
      setEmails([''])
      setOpen(false)
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Invitation error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Send invitations to new team members. They'll receive an email with instructions to join your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeEmailField(index)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addEmailField}
            disabled={loading}
            className="w-full"
          >
            Add Another Email
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitations'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
