'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { clerkClient } from '@clerk/nextjs/server'

interface InviteTeamMemberInput {
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'CUSTOMER'
}

interface CreatePlaceholderUserInput {
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'CUSTOMER'
}

/**
 * Invite team members via Clerk
 */
export async function inviteTeamMembers(members: InviteTeamMemberInput[]) {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can invite team members' }
    }

    const results = []

    for (const member of members) {
      try {
        // Create invitation in Clerk
        const invitation = await (await clerkClient()).invitations.createInvitation({
          emailAddress: member.email,
          publicMetadata: {
            organizationId: user.organizationId,
            role: member.role,
            firstName: member.firstName,
            lastName: member.lastName,
          },
        })

        // Create user record in database
        const dbUser = await prisma.user.create({
          data: {
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            organizationId: user.organizationId,
            isPlaceholder: false,
            invitedAt: new Date(),
          },
        })

        results.push({
          success: true,
          email: member.email,
          userId: dbUser.id,
        })
      } catch (error: any) {
        results.push({
          success: false,
          email: member.email,
          error: error.message,
        })
      }
    }

    revalidatePath('/dashboard/team')

    const successCount = results.filter(r => r.success).length
    return {
      success: successCount > 0,
      message: `Invited ${successCount} of ${members.length} team members`,
      results,
    }
  } catch (error: any) {
    console.error('Error inviting team members:', error)
    return { success: false, error: error.message || 'Failed to invite team members' }
  }
}

/**
 * Create placeholder users (users created before Clerk invitation)
 */
export async function createPlaceholderUsers(users: CreatePlaceholderUserInput[]) {
  try {
    const currentUser = await getCurrentUserWithOrg()

    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can create placeholder users' }
    }

    const createdUsers = []

    for (const userData of users) {
      // Check if user already exists
      const existing = await prisma.user.findFirst({
        where: {
          email: userData.email,
          organizationId: currentUser.organizationId,
        },
      })

      if (existing) {
        continue
      }

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          organizationId: currentUser.organizationId,
          isPlaceholder: true,
          invitedAt: null,
        },
      })

      createdUsers.push(user)
    }

    revalidatePath('/dashboard/team')

    return {
      success: true,
      data: createdUsers,
      message: `Created ${createdUsers.length} placeholder user(s)`,
    }
  } catch (error: any) {
    console.error('Error creating placeholder users:', error)
    return { success: false, error: error.message || 'Failed to create placeholder users' }
  }
}

/**
 * Invite a placeholder user (convert to real invitation)
 */
export async function invitePlaceholderUser(userId: string) {
  try {
    const currentUser = await getCurrentUserWithOrg()

    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can invite users' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.organizationId !== currentUser.organizationId) {
      return { success: false, error: 'User not found' }
    }

    if (!user.isPlaceholder) {
      return { success: false, error: 'User is not a placeholder' }
    }

    // Create Clerk invitation
    await (await clerkClient()).invitations.createInvitation({
      emailAddress: user.email,
      publicMetadata: {
        organizationId: user.organizationId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })

    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        invitedAt: new Date(),
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      message: `Invitation sent to ${user.email}`,
    }
  } catch (error: any) {
    console.error('Error inviting placeholder user:', error)
    return { success: false, error: error.message || 'Failed to send invitation' }
  }
}

/**
 * Delete a placeholder user
 */
export async function deletePlaceholderUser(userId: string) {
  try {
    const currentUser = await getCurrentUserWithOrg()

    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can delete users' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.organizationId !== currentUser.organizationId) {
      return { success: false, error: 'User not found' }
    }

    if (!user.isPlaceholder) {
      return { success: false, error: 'Cannot delete non-placeholder users' }
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      message: 'User deleted successfully',
    }
  } catch (error: any) {
    console.error('Error deleting placeholder user:', error)
    return { success: false, error: error.message || 'Failed to delete user' }
  }
}

/**
 * Update user fields
 */
export async function updateUserFields(userId: string, fields: {
  firstName?: string
  lastName?: string
  role?: 'ADMIN' | 'CUSTOMER'
  emailNotifications?: boolean
  invoiceAlerts?: boolean
  paymentAlerts?: boolean
  statementAlerts?: boolean
}) {
  try {
    const currentUser = await getCurrentUserWithOrg()

    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can update user fields' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.organizationId !== currentUser.organizationId) {
      return { success: false, error: 'User not found' }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: fields,
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    }
  } catch (error: any) {
    console.error('Error updating user:', error)
    return { success: false, error: error.message || 'Failed to update user' }
  }
}

/**
 * Get pending invitations
 */
export async function getPendingInvitations() {
  try {
    const currentUser = await getCurrentUserWithOrg()

    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can view invitations' }
    }

    // Get Clerk invitations
    const invitationList = await (await clerkClient()).invitations.getInvitationList()

    // Filter for this organization
    const orgInvitations = invitationList.data.filter(
      (inv) => inv.publicMetadata?.organizationId === currentUser.organizationId
    )

    return {
      success: true,
      data: orgInvitations.map(inv => ({
        id: inv.id,
        email: inv.emailAddress,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    }
  } catch (error: any) {
    console.error('Error getting pending invitations:', error)
    return { success: false, error: error.message || 'Failed to get invitations' }
  }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string) {
  try {
    const currentUser = await getCurrentUserWithOrg()

    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can revoke invitations' }
    }

    await (await clerkClient()).invitations.revokeInvitation(invitationId)

    revalidatePath('/dashboard/team')

    return {
      success: true,
      message: 'Invitation revoked successfully',
    }
  } catch (error: any) {
    console.error('Error revoking invitation:', error)
    return { success: false, error: error.message || 'Failed to revoke invitation' }
  }
}

/**
 * Get all users in organization
 */
export async function getUsers() {
  try {
    const currentUser = await getCurrentUserWithOrg()

    const users = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    })

    return {
      success: true,
      data: users,
    }
  } catch (error: any) {
    console.error('Error getting users:', error)
    return { success: false, error: error.message || 'Failed to get users' }
  }
}
