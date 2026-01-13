import { prisma } from './db'

/**
 * Audit Log Service
 * Centralized utility for creating audit logs throughout the application
 */

export type AuditAction =
  // AR Document actions
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_deleted'
  | 'invoice_voided'
  | 'invoice_emailed'
  | 'invoice_shared'
  | 'credit_memo_created'
  | 'debit_memo_created'
  // Payment actions
  | 'payment_created'
  | 'payment_applied'
  | 'payment_voided'
  // Customer actions
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  // User actions
  | 'user_invited'
  | 'user_role_changed'
  | 'user_removed'
  // Settings actions
  | 'settings_updated'
  // Integration actions
  | 'integration_sync'
  | 'integration_sync_reverted'
  // Email actions
  | 'email_sent'
  | 'email_failed'

export type EntityType =
  | 'invoice'
  | 'payment'
  | 'customer'
  | 'user'
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
 * Create audit log for invoice creation
 */
export async function logInvoiceCreated(params: {
  invoiceId: string
  invoiceNumber: string
  amount: number
  customerName: string
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
    action: 'invoice_created',
    entityType: 'invoice',
    entityId: params.invoiceId,
    description: `Created invoice ${params.invoiceNumber} for $${params.amount.toFixed(2)} for ${params.customerName}`,
    metadata: {
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      customerName: params.customerName,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for payment application
 */
export async function logPaymentApplied(params: {
  paymentId: string
  paymentNumber: string
  amount: number
  customerName: string
  invoiceNumber: string
  appliedBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.appliedBy.id,
    userName: params.appliedBy.name,
    userEmail: params.appliedBy.email,
    action: 'payment_applied',
    entityType: 'payment',
    entityId: params.paymentId,
    description: `Applied payment ${params.paymentNumber} of $${params.amount.toFixed(2)} to invoice ${params.invoiceNumber} for ${params.customerName}`,
    metadata: {
      paymentNumber: params.paymentNumber,
      amount: params.amount,
      customerName: params.customerName,
      invoiceNumber: params.invoiceNumber,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for customer creation
 */
export async function logCustomerCreated(params: {
  customerId: string
  customerName: string
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
    action: 'customer_created',
    entityType: 'customer',
    entityId: params.customerId,
    description: `Created customer ${params.customerName}`,
    metadata: {
      customerName: params.customerName,
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

/**
 * Create audit log for invoice email sent
 */
export async function logInvoiceEmailed(params: {
  invoiceId: string
  invoiceNumber: string
  recipientEmail: string
  recipientName: string
  sentBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  emailId?: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.sentBy.id,
    userName: params.sentBy.name,
    userEmail: params.sentBy.email,
    action: 'invoice_emailed',
    entityType: 'invoice',
    entityId: params.invoiceId,
    description: `Emailed invoice ${params.invoiceNumber} to ${params.recipientName} (${params.recipientEmail})`,
    metadata: {
      invoiceNumber: params.invoiceNumber,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      emailId: params.emailId,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}

/**
 * Create audit log for failed email send
 */
export async function logEmailFailed(params: {
  invoiceId: string
  invoiceNumber: string
  recipientEmail: string
  error: string
  sentBy: {
    id: string
    name: string
    email: string
  }
  organizationId: string
  ipAddress?: string
}) {
  return createAuditLog({
    userId: params.sentBy.id,
    userName: params.sentBy.name,
    userEmail: params.sentBy.email,
    action: 'email_failed',
    entityType: 'invoice',
    entityId: params.invoiceId,
    description: `Failed to email invoice ${params.invoiceNumber} to ${params.recipientEmail}: ${params.error}`,
    metadata: {
      invoiceNumber: params.invoiceNumber,
      recipientEmail: params.recipientEmail,
      error: params.error,
    },
    organizationId: params.organizationId,
    ipAddress: params.ipAddress,
  })
}
