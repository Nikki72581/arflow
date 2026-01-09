import { Prisma } from '@prisma/client'

// ============================================
// PRISMA MODEL TYPES
// ============================================

export type Organization = Prisma.OrganizationGetPayload<{}>
export type User = Prisma.UserGetPayload<{}>
export type Customer = Prisma.CustomerGetPayload<{}>
export type ArDocument = Prisma.ArDocumentGetPayload<{}>
export type CustomerPayment = Prisma.CustomerPaymentGetPayload<{}>
export type PaymentApplication = Prisma.PaymentApplicationGetPayload<{}>
export type AuditLog = Prisma.AuditLogGetPayload<{}>
export type AcumaticaIntegration = Prisma.AcumaticaIntegrationGetPayload<{}>
export type AcumaticaCustomerMapping = Prisma.AcumaticaCustomerMappingGetPayload<{}>
export type IntegrationSyncLog = Prisma.IntegrationSyncLogGetPayload<{}>

// ============================================
// SHARED TYPES
// ============================================

export interface DateRange {
  from: Date
  to: Date
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type SortOrder = 'asc' | 'desc'

export interface TableFilters {
  search?: string
  status?: string
  dateRange?: DateRange
}
