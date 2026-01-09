'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  getAuditLogs,
  getEntityAuditHistory,
  getRecentActivity,
  type AuditAction,
  type EntityType,
} from '@/lib/audit-log'

/**
 * Get organization ID for current user
 */
async function getOrganizationId(): Promise<string> {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { organizationId: true },
  })

  if (!user?.organizationId) {
    throw new Error('User not associated with an organization')
  }

  return user.organizationId
}

// ============================================
// AUDIT LOG VIEWING ACTIONS
// ============================================

export interface AuditLogFilters {
  userId?: string
  action?: AuditAction
  entityType?: EntityType
  entityId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

/**
 * Get paginated audit logs with filters
 */
export async function getAuditLogsWithFilters(filters: AuditLogFilters = {}) {
  try {
    const organizationId = await getOrganizationId()
    
    const page = filters.page || 1
    const pageSize = filters.pageSize || 50
    const offset = (page - 1) * pageSize

    const result = await getAuditLogs({
      organizationId,
      userId: filters.userId,
      action: filters.action,
      entityType: filters.entityType,
      entityId: filters.entityId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: pageSize,
      offset,
    })

    if (!result.success) {
      return result
    }

    return {
      success: true,
      data: {
        logs: result.data?.logs || [],
        total: result.data?.total || 0,
        page,
        pageSize,
        totalPages: Math.ceil((result.data?.total || 0) / pageSize),
        hasMore: result.data?.hasMore || false,
      },
    }
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audit logs',
    }
  }
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityHistory(params: {
  entityType: EntityType
  entityId: string
  limit?: number
}) {
  try {
    const organizationId = await getOrganizationId()

    return getEntityAuditHistory({
      organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      limit: params.limit,
    })
  } catch (error) {
    console.error('Error getting entity history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get entity history',
    }
  }
}

/**
 * Get recent activity for dashboard
 */
export async function getDashboardActivity(limit: number = 10) {
  try {
    const organizationId = await getOrganizationId()

    return getRecentActivity({
      organizationId,
      limit,
    })
  } catch (error) {
    console.error('Error getting dashboard activity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get activity',
    }
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(params?: {
  startDate?: Date
  endDate?: Date
}) {
  try {
    const organizationId = await getOrganizationId()

    const whereClause: any = {
      organizationId,
    }

    if (params?.startDate || params?.endDate) {
      whereClause.createdAt = {}
      if (params.startDate) {
        whereClause.createdAt.gte = params.startDate
      }
      if (params.endDate) {
        whereClause.createdAt.lte = params.endDate
      }
    }

    // Get action counts
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    // Get user activity
    const userActivity = await prisma.auditLog.groupBy({
      by: ['userId', 'userName'],
      where: {
        ...whereClause,
        userId: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    })

    // Get total count
    const totalLogs = await prisma.auditLog.count({
      where: whereClause,
    })

    // Get entity type counts
    const entityTypeCounts = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    return {
      success: true,
      data: {
        totalLogs,
        actionCounts: actionCounts.map((item) => ({
          action: item.action,
          count: item._count.id,
        })),
        userActivity: userActivity.map((item) => ({
          userId: item.userId,
          userName: item.userName,
          actionsCount: item._count.id,
        })),
        entityTypeCounts: entityTypeCounts.map((item) => ({
          entityType: item.entityType,
          count: item._count.id,
        })),
      },
    }
  } catch (error) {
    console.error('Error getting audit log stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    }
  }
}

/**
 * Get list of users who have performed actions (for filter dropdown)
 */
export async function getAuditUsers() {
  try {
    const organizationId = await getOrganizationId()

    const users = await prisma.auditLog.findMany({
      where: {
        organizationId,
        userId: { not: null },
      },
      select: {
        userId: true,
        userName: true,
        userEmail: true,
      },
      distinct: ['userId'],
      orderBy: {
        userName: 'asc',
      },
    })

    return {
      success: true,
      data: users.filter((u) => u.userId) as Array<{
        userId: string
        userName: string | null
        userEmail: string | null
      }>,
    }
  } catch (error) {
    console.error('Error getting audit users:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get users',
    }
  }
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogsToCsv(filters: AuditLogFilters = {}) {
  try {
    const organizationId = await getOrganizationId()

    const result = await getAuditLogs({
      organizationId,
      userId: filters.userId,
      action: filters.action,
      entityType: filters.entityType,
      entityId: filters.entityId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: 10000, // Max for export
    })

    if (!result.success) {
      return result
    }

    // Format for CSV
    const logs = (result.data?.logs || []).map((log) => ({
      timestamp: log.createdAt,
      user: log.userName || 'System',
      email: log.userEmail || '',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || '',
      description: log.description,
      ipAddress: log.ipAddress || '',
    }))

    return {
      success: true,
      data: logs,
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export logs',
    }
  }
}

/**
 * Purge audit logs based on date range
 */
export async function purgeAuditLogs(params: {
  startDate?: Date
  endDate?: Date
}) {
  try {
    const organizationId = await getOrganizationId()

    // Build where clause
    const whereClause: any = {
      organizationId,
    }

    if (params.startDate || params.endDate) {
      whereClause.createdAt = {}
      if (params.startDate) {
        whereClause.createdAt.gte = params.startDate
      }
      if (params.endDate) {
        whereClause.createdAt.lte = params.endDate
      }
    } else {
      // Safety check: require at least one date filter to prevent accidental full deletion
      return {
        success: false,
        error: 'Please specify a date range for purging audit logs',
      }
    }

    // Count logs to be deleted
    const count = await prisma.auditLog.count({
      where: whereClause,
    })

    if (count === 0) {
      return {
        success: true,
        data: { deletedCount: 0 },
      }
    }

    // Delete the logs
    const result = await prisma.auditLog.deleteMany({
      where: whereClause,
    })

    return {
      success: true,
      data: { deletedCount: result.count },
    }
  } catch (error) {
    console.error('Error purging audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purge audit logs',
    }
  }
}
