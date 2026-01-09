import { prisma } from './db'

/**
 * Audit Log Service
 * Centralized utility for creating audit logs throughout the application
 */

export type AuditAction =
  // Commission actions
  | 'commission_created'
  | 'commission_approved'
  | 'commission_paid'
  | 'commission_rejected'
  | 'bulk_payout_processed'
  // Sale actions
  | 'sale_created'
  | 'sale_updated'
  | 'sale_deleted'
  // Plan actions
  | 'plan_created'
  | 'plan_updated'
  | 'plan_activated'
  | 'plan_deactivated'
  // User actions
  | 'user_invited'
  | 'user_role_changed'
  | 'user_removed'
  // Settings actions
  | 'settings_updated'
  // Integration actions
  | 'integration_sync'
  | 'integration_sync_reverted'

export type EntityType = 
  | 'commission'
  | 'sale'
  | 'plan'
  | 'user'
  | 'client'
  | 'project'
  | 'organization'
  | 'settings'
  | 'integration'

export interface CreateAuditLogParams {
  // Who
  userId?: string
  userName?: string
  userEmail?: string
  
  // What
  action: AuditAction
  entityType: EntityType
  entityId?: string
  description: string
  metadata?: Record<string, any>
  
  // Where
  organizationId: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        metadata: params.metadata || {},
        organizationId: params.organizationId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })

    return { success: true, data: auditLog }
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit logs shouldn't break the main flow
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create audit log',
    }
  }
}

/**
 * Create audit log for commission approval
 */
export async function logCommissionApproval(params: {
  commissionId: string
  amount: number
  salespersonId: string
  salespersonName: string
  approvedBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.approvedBy.id,
    userName: params.approvedBy.name,
    userEmail: params.approvedBy.email,
    action: 'commission_approved',
    entityType: 'commission',
    entityId: params.commissionId,
    description: `Approved commission of $${params.amount.toFixed(2)} for ${params.salespersonName}`,
    metadata: {
      amount: params.amount,
      salespersonId: params.salespersonId,
      salespersonName: params.salespersonName,
      oldStatus: 'PENDING',
      newStatus: 'APPROVED',
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for commission payment
 */
export async function logCommissionPayment(params: {
  commissionId: string
  amount: number
  salespersonId: string
  salespersonName: string
  paidBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.paidBy.id,
    userName: params.paidBy.name,
    userEmail: params.paidBy.email,
    action: 'commission_paid',
    entityType: 'commission',
    entityId: params.commissionId,
    description: `Marked commission of $${params.amount.toFixed(2)} as paid for ${params.salespersonName}`,
    metadata: {
      amount: params.amount,
      salespersonId: params.salespersonId,
      salespersonName: params.salespersonName,
      oldStatus: 'APPROVED',
      newStatus: 'PAID',
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for bulk payout
 */
export async function logBulkPayout(params: {
  totalAmount: number
  commissionsCount: number
  salespeopleCount: number
  calculationIds: string[]
  processedBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.processedBy.id,
    userName: params.processedBy.name,
    userEmail: params.processedBy.email,
    action: 'bulk_payout_processed',
    entityType: 'commission',
    description: `Processed bulk payout of $${params.totalAmount.toFixed(2)} for ${params.commissionsCount} commissions across ${params.salespeopleCount} salespeople`,
    metadata: {
      totalAmount: params.totalAmount,
      commissionsCount: params.commissionsCount,
      salespeopleCount: params.salespeopleCount,
      calculationIds: params.calculationIds,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for sale creation
 */
export async function logSaleCreated(params: {
  saleId: string
  amount: number
  clientName: string
  projectName: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.createdBy.id,
    userName: params.createdBy.name,
    userEmail: params.createdBy.email,
    action: 'sale_created',
    entityType: 'sale',
    entityId: params.saleId,
    description: `Created sale of $${params.amount.toFixed(2)} for ${params.clientName} - ${params.projectName}`,
    metadata: {
      amount: params.amount,
      clientName: params.clientName,
      projectName: params.projectName,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for plan changes
 */
export async function logPlanUpdated(params: {
  planId: string
  planName: string
  changes: Record<string, any>
  updatedBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.updatedBy.id,
    userName: params.updatedBy.name,
    userEmail: params.updatedBy.email,
    action: 'plan_updated',
    entityType: 'plan',
    entityId: params.planId,
    description: `Updated commission plan "${params.planName}"`,
    metadata: {
      planName: params.planName,
      changes: params.changes,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(params: {
  organizationId: string
  userId?: string
  action?: AuditAction
  entityType?: EntityType
  entityId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  try {
    const whereClause: any = {
      organizationId: params.organizationId,
    }

    if (params.userId) {
      whereClause.userId = params.userId
    }

    if (params.action) {
      whereClause.action = params.action
    }

    if (params.entityType) {
      whereClause.entityType = params.entityType
    }

    if (params.entityId) {
      whereClause.entityId = params.entityId
    }

    if (params.startDate || params.endDate) {
      whereClause.createdAt = {}
      if (params.startDate) {
        whereClause.createdAt.gte = params.startDate
      }
      if (params.endDate) {
        whereClause.createdAt.lte = params.endDate
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ])

    return {
      success: true,
      data: {
        logs,
        total,
        hasMore: (params.offset || 0) + logs.length < total,
      },
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
    }
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditHistory(params: {
  organizationId: string
  entityType: EntityType
  entityId: string
  limit?: number
}) {
  return getAuditLogs({
    organizationId: params.organizationId,
    entityType: params.entityType,
    entityId: params.entityId,
    limit: params.limit,
  })
}

/**
 * Get recent activity (for dashboard)
 */
export async function getRecentActivity(params: {
  organizationId: string
  limit?: number
}) {
  return getAuditLogs({
    organizationId: params.organizationId,
    limit: params.limit || 10,
  })
}
