import { z } from 'zod'

/**
 * Schema for creating a client
 */
export const createClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(150, 'Name too long'),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  customerNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
  billingAddress1: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
  shippingAddress1: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_HOLD', 'COLLECTIONS']).optional(),
})

/**
 * Schema for updating a client
 */
export const updateClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(150, 'Name too long').optional(),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  customerNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
  billingAddress1: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
  shippingAddress1: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_HOLD', 'COLLECTIONS']).optional(),
})

/**
 * Types inferred from schemas
 */
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
