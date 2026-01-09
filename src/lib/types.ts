import { Prisma } from '@prisma/client'

// ============================================
// PRISMA MODEL TYPES
// ============================================

export type Organization = Prisma.OrganizationGetPayload<{}>
export type User = Prisma.UserGetPayload<{}>
export type Client = Prisma.ClientGetPayload<{}>
export type Project = Prisma.ProjectGetPayload<{}>
export type CommissionPlan = Prisma.CommissionPlanGetPayload<{}>
export type CommissionRule = Prisma.CommissionRuleGetPayload<{}>
export type SalesTransaction = Prisma.SalesTransactionGetPayload<{}>
export type CommissionCalculation = Prisma.CommissionCalculationGetPayload<{}>
export type Payout = Prisma.PayoutGetPayload<{}>

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================

export type ClientWithProjects = Prisma.ClientGetPayload<{
  include: {
    projects: true
  }
}>

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    client: true
    commissionPlans: {
      include: {
        rules: true
      }
    }
  }
}>

export type ProjectWithClient = Prisma.ProjectGetPayload<{
  include: {
    client: true
    commissionPlans: {
      select: {
        id: true
        name: true
      }
    }
    _count: {
      select: {
        salesTransactions: true
      }
    }
  }
}>

export type CommissionPlanWithRules = Prisma.CommissionPlanGetPayload<{
  include: {
    rules: true
  }
}>

export type SalesTransactionWithRelations = Prisma.SalesTransactionGetPayload<{
  include: {
    project: {
      include: {
        client: true
      }
    }
    client: true
    user: true
    productCategory: true
    commissionCalculations: {
      include: {
        commissionPlan: true
      }
    }
  }
}>

export type CommissionCalculationWithRelations = Prisma.CommissionCalculationGetPayload<{
  include: {
    salesTransaction: true
    commissionPlan: true
    user: true
    payout: true
  }
}>

// ============================================
// FORM DATA TYPES
// ============================================

export interface ClientFormData {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export interface ProjectFormData {
  name: string
  description?: string
  clientId: string
  startDate?: Date
  endDate?: Date
  status?: string
}

export interface CommissionPlanFormData {
  name: string
  description?: string
  projectId?: string
  isActive?: boolean
}

export interface CommissionRuleFormData {
  ruleType: 'PERCENTAGE' | 'FLAT_AMOUNT' | 'TIERED'
  percentage?: number
  flatAmount?: number
  tierThreshold?: number
  tierPercentage?: number
  minAmount?: number
  maxAmount?: number
  description?: string
}

export interface SalesTransactionFormData {
  amount: number
  projectId: string
  userId: string
  transactionDate: Date
  description?: string
  invoiceNumber?: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

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

// ============================================
// DASHBOARD STATISTICS
// ============================================

export interface DashboardStats {
  totalRevenue: number
  totalCommissions: number
  pendingCommissions: number
  paidCommissions: number
  totalClients: number
  totalProjects: number
  activeProjects: number
  topSalespeople: {
    userId: string
    name: string
    totalCommissions: number
  }[]
}

export interface SalespersonStats {
  totalSales: number
  totalCommissions: number
  pendingCommissions: number
  paidCommissions: number
  recentTransactions: SalesTransactionWithRelations[]
  monthlyEarnings: {
    month: string
    amount: number
  }[]
}

// ============================================
// FILTER & SORT TYPES
// ============================================

export interface DateRange {
  from: Date
  to: Date
}

export type SortOrder = 'asc' | 'desc'

export interface TableFilters {
  search?: string
  status?: string
  dateRange?: DateRange
  sortBy?: string
  sortOrder?: SortOrder
  page?: number
  pageSize?: number
}