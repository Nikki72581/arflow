'use client'

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inviteTeamMembers, createPlaceholderUsers } from '@/app/actions/users'
import { toast } from 'sonner'

export function AddTeamMemberDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'invite' | 'placeholder'>('invite')

  // Invite mode state
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])

  // Placeholder mode state
  const [placeholderUsers, setPlaceholderUsers] = useState<Array<{
    email: string
    firstName: string
    lastName: string
    role: 'ADMIN' | 'CUSTOMER'
  }>>([{
    email: '',
    firstName: '',
    lastName: '',
    role: 'CUSTOMER'
  }])

  const addInviteEmailField = () => {
    setInviteEmails([...inviteEmails, ''])
  }

  const removeInviteEmailField = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index))
  }

  const updateInviteEmail = (index: number, value: string) => {
    const newEmails = [...inviteEmails]
    newEmails[index] = value
    setInviteEmails(newEmails)
  }

  const addPlaceholderUserField = () => {
    setPlaceholderUsers([...placeholderUsers, {
      email: '',
      firstName: '',
      lastName: '',
      role: 'CUSTOMER'
    }])
  }

  const removePlaceholderUserField = (index: number) => {
    setPlaceholderUsers(placeholderUsers.filter((_, i) => i !== index))
  }

  const updatePlaceholderUser = (index: number, field: string, value: string) => {
    const newUsers = [...placeholderUsers]
    newUsers[index] = { ...newUsers[index], [field]: value } as any
    setPlaceholderUsers(newUsers)
  }

  const handleInvite = async () => {
    const validEmails = inviteEmails.filter(e => e.trim().length > 0)

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
      setInviteEmails([''])
      setOpen(false)
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Invitation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlaceholder = async () => {
    const validUsers = placeholderUsers.filter(u => u.email.trim().length > 0)

    if (validUsers.length === 0) {
      toast.error('Please enter at least one user with an email address')
      return
    }

    setLoading(true)
    try {
      const result = await createPlaceholderUsers(
        validUsers.map(u => ({
          email: u.email.trim(),
          firstName: u.firstName.trim() || undefined,
          lastName: u.lastName.trim() || undefined,
          role: u.role,
        }))
      )

      if (!result.success) {
        toast.error(result.error || 'Failed to create placeholder users')
        return
      }

      toast.success(`Successfully created ${result.data?.count} placeholder user(s)`)
      setPlaceholderUsers([{
        email: '',
        firstName: '',
        lastName: '',
        role: 'CUSTOMER'
      }])
      setOpen(false)
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Create placeholder error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Choose how you'd like to add team members to your organization
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'invite' | 'placeholder')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite Now</TabsTrigger>
            <TabsTrigger value="placeholder">Create Placeholder</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 py-4">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-400">Send email invitations immediately</p>
              <p className="text-blue-600 dark:text-blue-300 mt-1">
                Team members will receive an email to join and can access the system right away.
              </p>
            </div>

            {inviteEmails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor={`email-${index}`}>Email Address</Label>
                  <Input
                    id={`email-${index}`}
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => updateInviteEmail(index, e.target.value)}
                    disabled={loading}
                  />
                </div>
                {inviteEmails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeInviteEmailField(index)}
                    disabled={loading}
                    className="mt-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addInviteEmailField}
              disabled={loading}
              className="w-full"
            >
              Add Another Email
            </Button>

            <div className="flex gap-2 justify-end pt-4">
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
          </TabsContent>

          <TabsContent value="placeholder" className="space-y-4 py-4">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3 text-sm">
              <p className="font-medium text-purple-700 dark:text-purple-400">Create user records for future setup</p>
              <p className="text-purple-600 dark:text-purple-300 mt-1">
                Perfect for mapping with external systems like Acumatica before inviting users. You can send invites later.
              </p>
            </div>

            <div className="space-y-6">
              {placeholderUsers.map((user, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">User {index + 1}</h4>
                    {placeholderUsers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlaceholderUserField(index)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor={`placeholder-email-${index}`}>Email Address *</Label>
                      <Input
                        id={`placeholder-email-${index}`}
                        type="email"
                        placeholder="email@example.com"
                        value={user.email}
                        onChange={(e) => updatePlaceholderUser(index, 'email', e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`placeholder-firstName-${index}`}>First Name</Label>
                      <Input
                        id={`placeholder-firstName-${index}`}
                        placeholder="John"
                        value={user.firstName}
                        onChange={(e) => updatePlaceholderUser(index, 'firstName', e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`placeholder-lastName-${index}`}>Last Name</Label>
                      <Input
                        id={`placeholder-lastName-${index}`}
                        placeholder="Doe"
                        value={user.lastName}
                        onChange={(e) => updatePlaceholderUser(index, 'lastName', e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor={`placeholder-role-${index}`}>Role</Label>
                      <Select
                        value={user.role}
                        onValueChange={(value) => updatePlaceholderUser(index, 'role', value)}
                        disabled={loading}
                      >
                        <SelectTrigger id={`placeholder-role-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CUSTOMER">Customer</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addPlaceholderUserField}
              disabled={loading}
              className="w-full"
            >
              Add Another User
            </Button>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePlaceholder} disabled={loading}>
                {loading ? 'Creating...' : 'Create Placeholder Users'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
