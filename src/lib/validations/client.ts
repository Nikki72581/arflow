import { z } from 'zod'

/**
 * Schema for creating a client
 */
export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tier: z.enum(['STANDARD', 'VIP', 'NEW', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROSPECTIVE', 'CHURNED']).optional(),
  clientId: z.string().optional(),
  territoryId: z.string().optional(),
})

/**
 * Schema for updating a client
 */
export const updateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tier: z.enum(['STANDARD', 'VIP', 'NEW', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROSPECTIVE', 'CHURNED']).optional(),
  clientId: z.string().optional(),
  territoryId: z.string().optional(),
})

/**
 * Types inferred from schemas
 */
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>