'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Get organization ID for current user
 */
async function getOrganizationId(): Promise<string> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { organizationId: true },
  })

  if (!user?.organizationId) {
    throw new Error('User not associated with an organization')
  }

  return user.organizationId
}

/**
 * Get all users in the organization
 */
export async function getUsers() {
  try {
    const organizationId = await getOrganizationId()

    const users = await prisma.user.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        employeeId: true,
        salespersonId: true,
        isPlaceholder: true,
        invitedAt: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    })

    return {
      success: true,
      data: users,
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    }
  }
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string) {
  try {
    const organizationId = await getOrganizationId()

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      success: true,
      data: user,
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    }
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: 'ADMIN' | 'SALESPERSON') {
  try {
    const organizationId = await getOrganizationId()

    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    })

    return {
      success: true,
      data: users,
    }
  } catch (error) {
    console.error('Error fetching users by role:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    }
  }
}

/**
 * Check if current user is an admin
 */
async function requireAdmin() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { organization: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }

  return user
}

/**
 * Invite team members to organization via Clerk
 */
export async function inviteTeamMembers(emailAddresses: string[]) {
  try {
    const admin = await requireAdmin()

    if (!emailAddresses || emailAddresses.length === 0) {
      return {
        success: false,
        error: 'At least one email address is required',
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailAddresses.filter(email => !emailRegex.test(email))

    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email format: ${invalidEmails.join(', ')}`,
      }
    }

    // Check if organization has a Clerk org ID
    if (!admin.organization.clerkOrgId) {
      return {
        success: false,
        error: 'Organization not configured with Clerk. Please contact support.',
      }
    }

    // Create invitations via Clerk
    const clerk = await clerkClient()
    const invitations = await clerk.organizations.createOrganizationInvitation({
      organizationId: admin.organization.clerkOrgId,
      emailAddress: emailAddresses[0],
      role: 'org:member',
    })

    // Handle multiple emails
    const allInvitations = [invitations]

    for (let i = 1; i < emailAddresses.length; i++) {
      const inv = await clerk.organizations.createOrganizationInvitation({
        organizationId: admin.organization.clerkOrgId,
        emailAddress: emailAddresses[i],
        role: 'org:member',
      })
      allInvitations.push(inv)
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'team_members_invited',
        entityType: 'user',
        description: `Invited ${emailAddresses.length} team member(s)`,
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userEmail: admin.email,
        organizationId: admin.organizationId,
        metadata: {
          invitedEmails: emailAddresses,
          invitationCount: allInvitations.length,
        },
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      data: {
        invitationCount: allInvitations.length,
        invitations: allInvitations.map(inv => ({
          id: inv.id,
          email: inv.emailAddress,
          status: inv.status,
        })),
      },
    }
  } catch (error) {
    console.error('Error inviting team members:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitations',
    }
  }
}

/**
 * Get pending invitations for the organization
 */
export async function getPendingInvitations() {
  try {
    const admin = await requireAdmin()

    if (!admin.organization.clerkOrgId) {
      return {
        success: false,
        error: 'Organization not configured with Clerk',
      }
    }

    const clerk = await clerkClient()
    const response = await clerk.organizations.getOrganizationInvitationList({
      organizationId: admin.organization.clerkOrgId,
      status: ['pending'],
    })

    return {
      success: true,
      data: response.data.map(inv => ({
        id: inv.id,
        email: inv.emailAddress,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    }
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invitations',
    }
  }
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitation(invitationId: string) {
  try {
    const admin = await requireAdmin()

    if (!admin.organization.clerkOrgId) {
      return {
        success: false,
        error: 'Organization not configured with Clerk',
      }
    }

    const clerk = await clerkClient()
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: admin.organization.clerkOrgId,
      invitationId,
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'invitation_revoked',
        entityType: 'invitation',
        entityId: invitationId,
        description: 'Revoked team member invitation',
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userEmail: admin.email,
        organizationId: admin.organizationId,
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke invitation',
    }
  }
}

/**
 * Update user fields (Employee ID and Salesperson ID)
 */
export async function updateUserFields(
  userId: string,
  data: {
    employeeId?: string
    salespersonId?: string
  }
) {
  try {
    const admin = await requireAdmin()

    // Verify the user belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: admin.organizationId,
      },
    })

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // Update the user fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        employeeId: data.employeeId || null,
        salespersonId: data.salespersonId || null,
      },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'user_updated',
        entityType: 'user',
        entityId: userId,
        description: `Updated user fields for ${targetUser.firstName} ${targetUser.lastName}`,
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userEmail: admin.email,
        organizationId: admin.organizationId,
        metadata: {
          employeeId: data.employeeId,
          salespersonId: data.salespersonId,
        },
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      data: updatedUser,
    }
  } catch (error) {
    console.error('Error updating user fields:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    }
  }
}

/**
 * Create placeholder user(s) without sending Clerk invites
 * Allows admin to pre-create users for mapping with external systems
 */
export async function createPlaceholderUsers(
  users: Array<{
    email: string
    firstName?: string
    lastName?: string
    employeeId?: string
    salespersonId?: string
    role?: 'ADMIN' | 'SALESPERSON'
  }>
) {
  try {
    const admin = await requireAdmin()

    if (!users || users.length === 0) {
      return {
        success: false,
        error: 'At least one user is required',
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = users.filter(u => !emailRegex.test(u.email))

    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email format: ${invalidEmails.map(u => u.email).join(', ')}`,
      }
    }

    // Check for duplicate emails within the request
    const emailSet = new Set<string>()
    const duplicates: string[] = []
    users.forEach(u => {
      const lowerEmail = u.email.toLowerCase()
      if (emailSet.has(lowerEmail)) {
        duplicates.push(u.email)
      }
      emailSet.add(lowerEmail)
    })

    if (duplicates.length > 0) {
      return {
        success: false,
        error: `Duplicate emails in request: ${duplicates.join(', ')}`,
      }
    }

    // Check for existing users with same email in this organization
    const existingUsers = await prisma.user.findMany({
      where: {
        organizationId: admin.organizationId,
        email: {
          in: users.map(u => u.email.toLowerCase()),
        },
      },
      select: { email: true },
    })

    if (existingUsers.length > 0) {
      return {
        success: false,
        error: `Users already exist with emails: ${existingUsers.map(u => u.email).join(', ')}`,
      }
    }

    // Create placeholder users
    const createdUsers = await prisma.$transaction(
      users.map(userData =>
        prisma.user.create({
          data: {
            email: userData.email.toLowerCase(),
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            employeeId: userData.employeeId || null,
            salespersonId: userData.salespersonId || null,
            role: userData.role || 'SALESPERSON',
            organizationId: admin.organizationId,
            isPlaceholder: true,
            clerkId: null, // No Clerk account yet
            invitedAt: null,
          },
        })
      )
    )

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'placeholder_users_created',
        entityType: 'user',
        description: `Created ${createdUsers.length} placeholder user(s)`,
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userEmail: admin.email,
        organizationId: admin.organizationId,
        metadata: {
          users: createdUsers.map(u => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            employeeId: u.employeeId,
            salespersonId: u.salespersonId,
          })),
        },
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      data: {
        count: createdUsers.length,
        users: createdUsers.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          employeeId: u.employeeId,
          salespersonId: u.salespersonId,
          role: u.role,
        })),
      },
    }
  } catch (error) {
    console.error('Error creating placeholder users:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create placeholder users',
    }
  }
}

/**
 * Send Clerk invite to a placeholder user
 * Converts placeholder user to active user once they accept
 */
export async function invitePlaceholderUser(userId: string) {
  try {
    const admin = await requireAdmin()

    // Get the placeholder user
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: admin.organizationId,
        isPlaceholder: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'Placeholder user not found',
      }
    }

    if (!admin.organization.clerkOrgId) {
      return {
        success: false,
        error: 'Organization not configured with Clerk',
      }
    }

    // Send Clerk invitation
    const clerk = await clerkClient()
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: admin.organization.clerkOrgId,
      emailAddress: user.email,
      role: 'org:member',
    })

    // Update user to mark as invited
    await prisma.user.update({
      where: { id: userId },
      data: {
        invitedAt: new Date(),
      },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'placeholder_user_invited',
        entityType: 'user',
        entityId: userId,
        description: `Sent Clerk invitation to placeholder user ${user.email}`,
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userEmail: admin.email,
        organizationId: admin.organizationId,
        metadata: {
          invitationId: invitation.id,
          userEmail: user.email,
        },
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        email: user.email,
      },
    }
  } catch (error) {
    console.error('Error inviting placeholder user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation',
    }
  }
}

/**
 * Delete a placeholder user (only if they haven't been invited yet)
 */
export async function deletePlaceholderUser(userId: string) {
  try {
    const admin = await requireAdmin()

    // Get the placeholder user
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: admin.organizationId,
        isPlaceholder: true,
        invitedAt: null, // Can only delete if not invited yet
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'Placeholder user not found or already invited',
      }
    }

    // Check if user has any related data
    const [salesCount, commissionCount] = await Promise.all([
      prisma.salesTransaction.count({ where: { userId } }),
      prisma.commissionCalculation.count({ where: { userId } }),
    ])

    if (salesCount > 0 || commissionCount > 0) {
      return {
        success: false,
        error: 'Cannot delete user with existing sales or commissions',
      }
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'placeholder_user_deleted',
        entityType: 'user',
        entityId: userId,
        description: `Deleted placeholder user ${user.email}`,
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userEmail: admin.email,
        organizationId: admin.organizationId,
        metadata: {
          userEmail: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    })

    revalidatePath('/dashboard/team')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting placeholder user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete placeholder user',
    }
  }
}
