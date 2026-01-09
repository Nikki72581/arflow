'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { DateRange } from '@/lib/types'

/**
 * Get sales by customer for reports
 * Groups AR documents by customer
 */
export async function getSalesByCategory(dateRange?: DateRange) {
  try {
    const user = await getCurrentUserWithOrg()

    const where: any = {
      organizationId: user.organizationId,
    }

    if (dateRange) {
      where.documentDate = {
        gte: dateRange.from,
        lte: dateRange.to,
      }
    }

    // Get all documents with customer info
    const documents = await prisma.arDocument.findMany({
      where,
      include: {
        customer: true,
      },
    })

    // Group by customer
    const categoryMap = new Map<string, { category: string; sales: number; count: number }>()

    documents.forEach(doc => {
      const customerName = doc.customer.companyName
      const existing = categoryMap.get(customerName) || { category: customerName, sales: 0, count: 0 }
      existing.sales += doc.totalAmount
      existing.count += 1
      categoryMap.set(customerName, existing)
    })

    // Convert to array and sort by sales
    const data = Array.from(categoryMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10) // Top 10 customers

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    console.error('Error getting sales by category:', error)
    return { success: false, error: error.message || 'Failed to get sales by category' }
  }
}
