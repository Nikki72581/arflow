'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { DateRange } from '@/lib/types'

/**
 * Get dashboard statistics for AR management
 */
export async function getDashboardStats(dateRange: DateRange) {
  try {
    const user = await getCurrentUserWithOrg()

    // Get total AR amounts for the period
    const documents = await prisma.arDocument.findMany({
      where: {
        organizationId: user.organizationId,
        documentDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
    })

    const totalSales = documents.reduce((sum, doc) => sum + doc.totalAmount, 0)
    const salesCount = documents.length

    // Get outstanding AR balances (all time, not filtered by date)
    const outstandingDocs = await prisma.arDocument.findMany({
      where: {
        organizationId: user.organizationId,
        status: {
          in: ['OPEN', 'PARTIAL'],
        },
      },
    })

    const totalOutstanding = outstandingDocs.reduce((sum, doc) => sum + doc.balanceDue, 0)
    const outstandingCount = outstandingDocs.length

    // Get document status breakdown
    const openDocs = outstandingDocs.filter(d => d.status === 'OPEN')
    const partialDocs = outstandingDocs.filter(d => d.status === 'PARTIAL')
    const paidDocs = await prisma.arDocument.count({
      where: {
        organizationId: user.organizationId,
        status: 'PAID',
      },
    })

    // Get payments received in period
    const paymentsInPeriod = await prisma.customerPayment.findMany({
      where: {
        organizationId: user.organizationId,
        paymentDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
    })

    const totalPaymentsReceived = paymentsInPeriod.reduce((sum, p) => sum + p.amount, 0)

    // Calculate average payment/invoice ratio
    const averageCollectionRate = totalSales > 0 ? (totalPaymentsReceived / totalSales) * 100 : 0

    // Get active counts
    const activeCustomers = await prisma.customer.count({
      where: {
        organizationId: user.organizationId,
        status: 'ACTIVE',
      },
    })

    const totalUsers = await prisma.user.count({
      where: {
        organizationId: user.organizationId,
      },
    })

    return {
      success: true,
      data: {
        totalSales,
        salesCount,
        totalCommissions: totalOutstanding, // Maps to old field name for UI compatibility
        commissionsCount: outstandingCount, // Maps to old field name
        pendingCommissions: openDocs.length, // Open invoices
        approvedCommissions: partialDocs.length, // Partially paid
        paidCommissions: paidDocs, // Fully paid
        averageCommissionRate: averageCollectionRate, // Collection rate percentage
        activePlansCount: 0, // Not applicable to ARFlow
        activeClientsCount: activeCustomers,
        salesPeopleCount: totalUsers,
      },
    }
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error)
    return { success: false, error: error.message || 'Failed to get dashboard stats' }
  }
}

/**
 * Get AR trends over time (monthly aggregation)
 */
export async function getCommissionTrends(params: { dateRange: DateRange }) {
  try {
    const user = await getCurrentUserWithOrg()
    const { dateRange } = params

    // Get all documents in range
    const documents = await prisma.arDocument.findMany({
      where: {
        organizationId: user.organizationId,
        documentDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      orderBy: {
        documentDate: 'asc',
      },
    })

    // Get payments in range
    const payments = await prisma.customerPayment.findMany({
      where: {
        organizationId: user.organizationId,
        paymentDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      orderBy: {
        paymentDate: 'asc',
      },
    })

    // Group by month
    const monthlyData = new Map<string, {
      sales: number
      commissions: number // Actually payments received
      count: number
      rate: number
    }>()

    documents.forEach(doc => {
      const monthKey = doc.documentDate.toISOString().substring(0, 7) // YYYY-MM
      const existing = monthlyData.get(monthKey) || { sales: 0, commissions: 0, count: 0, rate: 0 }
      existing.sales += doc.totalAmount
      existing.count += 1
      monthlyData.set(monthKey, existing)
    })

    payments.forEach(payment => {
      const monthKey = payment.paymentDate.toISOString().substring(0, 7)
      const existing = monthlyData.get(monthKey) || { sales: 0, commissions: 0, count: 0, rate: 0 }
      existing.commissions += payment.amount
      monthlyData.set(monthKey, existing)
    })

    // Calculate rates and format
    const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      sales: data.sales,
      commissions: data.commissions,
      count: data.count,
      rate: data.sales > 0 ? (data.commissions / data.sales) * 100 : 0,
    }))

    return {
      success: true,
      data: trends,
    }
  } catch (error: any) {
    console.error('Error getting AR trends:', error)
    return { success: false, error: error.message || 'Failed to get AR trends' }
  }
}

/**
 * Get top performing customers by total AR
 */
export async function getTopPerformers(dateRange: DateRange, limit: number = 10) {
  try {
    const user = await getCurrentUserWithOrg()

    // Get customers with their document totals in range
    const customers = await prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        arDocuments: {
          where: {
            documentDate: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        },
        payments: {
          where: {
            paymentDate: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        },
      },
    })

    // Calculate totals and sort
    const performers = customers
      .map(customer => {
        const totalSales = customer.arDocuments.reduce((sum, doc) => sum + doc.totalAmount, 0)
        const totalPayments = customer.payments.reduce((sum, p) => sum + p.amount, 0)
        const outstandingBalance = customer.currentBalance

        return {
          id: customer.id,
          name: customer.companyName,
          email: customer.email || '',
          totalSales,
          totalCommissions: totalPayments, // Maps to old field name
          commissionsCount: customer.arDocuments.length,
          conversionRate: totalSales > 0 ? (totalPayments / totalSales) * 100 : 0,
          outstandingBalance,
        }
      })
      .filter(p => p.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit)

    return {
      success: true,
      data: performers,
    }
  } catch (error: any) {
    console.error('Error getting top performers:', error)
    return { success: false, error: error.message || 'Failed to get top performers' }
  }
}

/**
 * Get export data for reports
 */
export async function getCommissionExportData(dateRange: DateRange, format: 'csv' | 'pdf' | 'excel') {
  try {
    const user = await getCurrentUserWithOrg()

    const documents = await prisma.arDocument.findMany({
      where: {
        organizationId: user.organizationId,
        documentDate: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        documentDate: 'desc',
      },
    })

    // Format for export
    const exportData = documents.map(doc => ({
      documentNumber: doc.documentNumber,
      customerName: doc.customer.companyName,
      documentDate: doc.documentDate.toISOString().split('T')[0],
      dueDate: doc.dueDate?.toISOString().split('T')[0] || '',
      totalAmount: doc.totalAmount,
      amountPaid: doc.amountPaid,
      balanceDue: doc.balanceDue,
      status: doc.status,
    }))

    return {
      success: true,
      data: exportData,
      format,
    }
  } catch (error: any) {
    console.error('Error getting export data:', error)
    return { success: false, error: error.message || 'Failed to get export data' }
  }
}
