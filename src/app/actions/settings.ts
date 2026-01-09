'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * Get user profile
 */
export async function getUserProfile() {
  try {
    const user = await getCurrentUserWithOrg()

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailNotifications: true,
        invoiceAlerts: true,
        paymentAlerts: true,
        statementAlerts: true,
        themePreference: true,
      },
    })

    if (!profile) {
      return { success: false, error: 'User not found' }
    }

    return {
      success: true,
      data: profile,
    }
  } catch (error: any) {
    console.error('Error getting user profile:', error)
    return { success: false, error: error.message || 'Failed to get user profile' }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: {
  firstName?: string
  lastName?: string
}) {
  try {
    const user = await getCurrentUserWithOrg()

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    })

    revalidatePath('/dashboard/settings')

    return {
      success: true,
      data: updated,
      message: 'Profile updated successfully',
    }
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return { success: false, error: error.message || 'Failed to update profile' }
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(data: {
  emailNotifications?: boolean
  invoiceAlerts?: boolean
  paymentAlerts?: boolean
  statementAlerts?: boolean
}) {
  try {
    const user = await getCurrentUserWithOrg()

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    })

    revalidatePath('/dashboard/settings')

    return {
      success: true,
      data: updated,
      message: 'Notification preferences updated',
    }
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return { success: false, error: error.message || 'Failed to update preferences' }
  }
}

/**
 * Update theme preference
 */
export async function updateThemePreference(theme: 'light' | 'dark' | 'system') {
  try {
    const user = await getCurrentUserWithOrg()

    await prisma.user.update({
      where: { id: user.id },
      data: { themePreference: theme },
    })

    return {
      success: true,
      message: 'Theme updated',
    }
  } catch (error: any) {
    console.error('Error updating theme:', error)
    return { success: false, error: error.message || 'Failed to update theme' }
  }
}

/**
 * Get organization settings (admin only)
 */
export async function getOrganizationSettings() {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can view organization settings' }
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    })

    if (!organization) {
      return { success: false, error: 'Organization not found' }
    }

    return {
      success: true,
      data: organization,
    }
  } catch (error: any) {
    console.error('Error getting organization settings:', error)
    return { success: false, error: error.message || 'Failed to get organization settings' }
  }
}

/**
 * Update organization settings (admin only)
 */
export async function updateOrganizationSettings(data: {
  name?: string
  slug?: string
}) {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can update organization settings' }
    }

    const updated = await prisma.organization.update({
      where: { id: user.organizationId },
      data,
    })

    revalidatePath('/dashboard/settings')

    return {
      success: true,
      data: updated,
      message: 'Organization settings updated',
    }
  } catch (error: any) {
    console.error('Error updating organization settings:', error)
    return { success: false, error: error.message || 'Failed to update organization settings' }
  }
}
