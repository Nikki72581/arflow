'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface AuditLogFilters {
  search?: string
  userId?: string
  action?: string
  entityType?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogsWithFilters(filters: AuditLogFilters) {
  try {
    const user = await getCurrentUserWithOrg()

    const where: any = {
      organizationId: user.organizationId,
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.entityType) {
      where.entityType = filters.entityType
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { userName: { contains: filters.search, mode: 'insensitive' } },
        { userEmail: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 50

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    }
  } catch (error: any) {
    console.error('Error getting audit logs:', error)
    return { success: false, error: error.message || 'Failed to get audit logs' }
  }
}

/**
 * Get list of users who have audit log entries (for filtering)
 */
export async function getAuditUsers() {
  try {
    const user = await getCurrentUserWithOrg()

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: user.organizationId,
        userId: { not: null },
      },
      select: {
        userId: true,
        userName: true,
        userEmail: true,
      },
      distinct: ['userId'],
    })

    const users = logs
      .filter(log => log.userId)
      .map(log => ({
        id: log.userId!,
        name: log.userName || log.userEmail || 'Unknown User',
        email: log.userEmail,
      }))

    return {
      success: true,
      data: users,
    }
  } catch (error: any) {
    console.error('Error getting audit users:', error)
    return { success: false, error: error.message || 'Failed to get audit users' }
  }
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogsToCsv(filters: AuditLogFilters) {
  try {
    const user = await getCurrentUserWithOrg()

    const where: any = {
      organizationId: user.organizationId,
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.entityType) {
      where.entityType = filters.entityType
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 10000, // Limit to prevent memory issues
    })

    // Format for CSV
    const csvData = logs.map(log => ({
      timestamp: log.createdAt.toISOString(),
      user: log.userName || log.userEmail || 'System',
      email: log.userEmail || '',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || '',
      description: log.description,
      ipAddress: log.ipAddress || '',
    }))

    return {
      success: true,
      data: csvData,
    }
  } catch (error: any) {
    console.error('Error exporting audit logs:', error)
    return { success: false, error: error.message || 'Failed to export audit logs' }
  }
}

/**
 * Purge old audit logs (admin only)
 */
export async function purgeAuditLogs(
  params: number | { startDate?: Date; endDate?: Date }
) {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can purge audit logs' }
    }

    const where: {
      organizationId: string
      createdAt?: { lt?: Date; gte?: Date; lte?: Date }
    } = { organizationId: user.organizationId }

    if (typeof params === 'number') {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - params)
      where.createdAt = { lt: cutoffDate }
    } else {
      if (params.startDate || params.endDate) {
        where.createdAt = {}
        if (params.startDate) where.createdAt.gte = params.startDate
        if (params.endDate) where.createdAt.lte = params.endDate
      }
    }

    const result = await prisma.auditLog.deleteMany({
      where,
    })

    revalidatePath('/dashboard/audit-logs')

    return {
      success: true,
      data: {
        deletedCount: result.count,
      },
      message: `Purged ${result.count} audit log entries`,
    }
  } catch (error: any) {
    console.error('Error purging audit logs:', error)
    return { success: false, error: error.message || 'Failed to purge audit logs' }
  }
}
