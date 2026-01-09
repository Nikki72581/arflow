import { z } from 'zod'

/**
 * Schema for creating a sales transaction
 * Note: projectId is optional here, but may be required based on organization settings
 */
export const createSalesTransactionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  transactionType: z.enum(['SALE', 'RETURN', 'ADJUSTMENT']).default('SALE'),
  parentTransactionId: z.string().optional(),
  productCategoryId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  description: z.string().optional(),
  projectId: z.string().optional(), // Optional - enforced in business logic based on org settings
  userId: z.string().min(1, 'Salesperson is required'),
  clientId: z.string().optional(), // For sales without projects, track client directly
  commissionPlanId: z.string().optional(), // If not provided, will use project's default plan or client/org-level plan
})

/**
 * Schema for updating a sales transaction
 */
export const updateSalesTransactionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0').optional(),
  transactionDate: z.string().optional(),
  transactionType: z.enum(['SALE', 'RETURN', 'ADJUSTMENT']).optional(),
  productCategoryId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  userId: z.string().optional(),
  commissionPlanId: z.string().optional(),
})

/**
 * Schema for CSV import row
 * Note: projectName is optional here, but may be required based on organization settings
 */
export const csvImportRowSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  projectName: z.string().optional(), // Optional - enforced based on org settings
  clientName: z.string().optional(), // For sales without projects
  salespersonEmail: z.string().email('Valid email is required'),
})

/**
 * Schema for bulk approval
 */
export const bulkApproveSchema = z.object({
  calculationIds: z.array(z.string()).min(1, 'At least one calculation must be selected'),
})

/**
 * Types inferred from schemas
 */
export type CreateSalesTransactionInput = z.infer<typeof createSalesTransactionSchema>
export type UpdateSalesTransactionInput = z.infer<typeof updateSalesTransactionSchema>
export type CsvImportRow = z.infer<typeof csvImportRowSchema>
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>
