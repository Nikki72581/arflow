import { z } from 'zod'

/**
 * Schema for creating a project
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
  startDate: z.string().optional().or(z.date().optional()),
  endDate: z.string().optional().or(z.date().optional()),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
})

/**
 * Schema for updating a project
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional().or(z.date().optional()),
  endDate: z.string().optional().or(z.date().optional()),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

/**
 * Types inferred from schemas
 */
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
