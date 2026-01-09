'use client'

import { useEffect, useState } from 'react'
import { Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPendingInvitations, revokeInvitation } from '@/app/actions/users'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

type Invitation = {
  id: string
  email: string
  status?: string
  createdAt: number
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const loadInvitations = async () => {
    setLoading(true)
    try {
      const result = await getPendingInvitations()
      if (result.success && result.data) {
        setInvitations(result.data)
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvitations()
  }, [])

  const handleRevoke = async (invitationId: string) => {
    setRevoking(invitationId)
    try {
      const result = await revokeInvitation(invitationId)

      if (result.success) {
        toast.success('Invitation revoked')
        await loadInvitations()
      } else {
        toast.error(result.error || 'Failed to revoke invitation')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Revoke error:', error)
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading invitations...</p>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{invitation.email}</p>
                <p className="text-sm text-muted-foreground">
                  Sent {formatDate(new Date(invitation.createdAt))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  {invitation.status || 'pending'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(invitation.id)}
                  disabled={revoking === invitation.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
