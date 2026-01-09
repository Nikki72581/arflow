'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { DateRange } from '@/lib/types'
import { Prisma } from '@prisma/client'

export async function getSalesByCategory(dateRange?: DateRange) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    const whereClause: Prisma.SalesTransactionWhereInput = {
      organizationId: orgId,
      transactionType: 'SALE',
    }

    if (dateRange?.from) {
      whereClause.transactionDate = {
        gte: dateRange.from,
        ...(dateRange.to && { lte: dateRange.to }),
      }
    }

    const salesByCategory = await prisma.salesTransaction.groupBy({
      by: ['productCategoryId'],
      where: whereClause,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    // Get category details
    const categoryIds = salesByCategory
      .map(s => s.productCategoryId)
      .filter((id): id is string => id !== null)

    const categories = await prisma.productCategory.findMany({
      where: {
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    })

    const categoryMap = new Map(categories.map(c => [c.id, c.name]))

    const data = salesByCategory.map(item => ({
      category: item.productCategoryId ? (categoryMap.get(item.productCategoryId) || 'Unknown') : 'Uncategorized',
      sales: item._sum.amount || 0,
      count: item._count.id,
    }))

    // Sort by sales descending
    data.sort((a, b) => b.sales - a.sales)

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching sales by category:', error)
    return { success: false, error: 'Failed to fetch sales by category' }
  }
}

export async function getSalesByTerritory(dateRange?: DateRange) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    const whereClause: Prisma.SalesTransactionWhereInput = {
      organizationId: orgId,
      transactionType: 'SALE',
    }

    if (dateRange?.from) {
      whereClause.transactionDate = {
        gte: dateRange.from,
        ...(dateRange.to && { lte: dateRange.to }),
      }
    }

    // Get sales with client territory information
    const salesWithTerritory = await prisma.salesTransaction.findMany({
      where: whereClause,
      include: {
        client: {
          include: {
            territory: true,
          },
        },
      },
    })

    // Group by territory
    const territoryMap = new Map<string, { sales: number; count: number }>()

    salesWithTerritory.forEach(sale => {
      const territoryName = sale.client?.territory?.name || 'Unassigned'
      const existing = territoryMap.get(territoryName) || { sales: 0, count: 0 }
      existing.sales += sale.amount
      existing.count += 1
      territoryMap.set(territoryName, existing)
    })

    const data = Array.from(territoryMap.entries()).map(([territory, stats]) => ({
      territory,
      sales: stats.sales,
      count: stats.count,
    }))

    // Sort by sales descending
    data.sort((a, b) => b.sales - a.sales)

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching sales by territory:', error)
    return { success: false, error: 'Failed to fetch sales by territory' }
  }
}

export async function getSalesByClientTier(dateRange?: DateRange) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    const whereClause: Prisma.SalesTransactionWhereInput = {
      organizationId: orgId,
      transactionType: 'SALE',
    }

    if (dateRange?.from) {
      whereClause.transactionDate = {
        gte: dateRange.from,
        ...(dateRange.to && { lte: dateRange.to }),
      }
    }

    // Get sales with client tier information
    const salesWithClient = await prisma.salesTransaction.findMany({
      where: whereClause,
      include: {
        client: true,
      },
    })

    // Group by client tier
    const tierMap = new Map<string, { sales: number; count: number }>()

    salesWithClient.forEach(sale => {
      const tier = sale.client?.tier || 'STANDARD'
      const existing = tierMap.get(tier) || { sales: 0, count: 0 }
      existing.sales += sale.amount
      existing.count += 1
      tierMap.set(tier, existing)
    })

    const data = Array.from(tierMap.entries()).map(([tier, stats]) => ({
      tier,
      sales: stats.sales,
      count: stats.count,
    }))

    // Sort by sales descending
    data.sort((a, b) => b.sales - a.sales)

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching sales by client tier:', error)
    return { success: false, error: 'Failed to fetch sales by client tier' }
  }
}
