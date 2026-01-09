import { z } from 'zod'

/**
 * Schema for updating user profile
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  email: z.string().email('Invalid email address').optional(),
})

/**
 * Schema for user notification preferences
 */
export const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  salesAlerts: z.boolean().default(true),
  commissionAlerts: z.boolean().default(true),
  weeklyReports: z.boolean().default(false),
})

/**
 * Types inferred from schemas
 */
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>
