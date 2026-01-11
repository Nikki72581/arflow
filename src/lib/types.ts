import { Prisma } from '@prisma/client'

// ============================================
// PRISMA MODEL TYPES
// ============================================

export type Organization = Prisma.OrganizationGetPayload<{}>
export type User = Prisma.UserGetPayload<{}>
export type Customer = Prisma.CustomerGetPayload<{}>
export type ArDocument = Prisma.ArDocumentGetPayload<{}>
export type ArDocumentLineItem = Prisma.ArDocumentLineItemGetPayload<{}>
export type CustomerPayment = Prisma.CustomerPaymentGetPayload<{}>
export type PaymentApplication = Prisma.PaymentApplicationGetPayload<{}>
export type AuditLog = Prisma.AuditLogGetPayload<{}>
export type AcumaticaIntegration = Prisma.AcumaticaIntegrationGetPayload<{}>
export type AcumaticaCustomerMapping = Prisma.AcumaticaCustomerMappingGetPayload<{}>
export type IntegrationSyncLog = Prisma.IntegrationSyncLogGetPayload<{}>

// Enhanced document types with relations
export type ArDocumentWithLineItems = Prisma.ArDocumentGetPayload<{
  include: {
    lineItems: true
    customer: true
    organization: true
  }
}>

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

// ============================================
// LINE ITEM TYPES
// ============================================

export interface LineItemFormData {
  id?: string // For editing existing line items
  description: string
  quantity: number
  unitPrice: number
  discountPercent: number
  taxPercent: number
}

export interface CalculatedTotals {
  subtotal: number
  totalDiscount: number
  totalTax: number
  grandTotal: number
}

// ============================================
// PUBLIC INVOICE TYPES
// ============================================

export interface PublicInvoiceData {
  id: string
  documentNumber: string
  documentDate: Date
  dueDate: Date | null
  subtotal: number
  taxAmount: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  status: string
  customerNotes: string | null
  lineItems: ArDocumentLineItem[]
  customer: {
    companyName: string
    billingAddress1: string | null
    billingAddress2: string | null
    billingCity: string | null
    billingState: string | null
    billingZip: string | null
  }
  organization: {
    name: string
    logoUrl: string | null
    address1: string | null
    address2: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    phone: string | null
    email: string | null
    website: string | null
  }
  canPay: boolean // true if Stripe enabled and balance due > 0
}
