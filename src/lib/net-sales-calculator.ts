import { prisma } from '@/lib/db'

/**
 * Calculate net sales amount (gross - returns/credits)
 */
export async function calculateNetSalesAmount(
  transactionId: string
): Promise<number> {
  const transaction = await prisma.salesTransaction.findUnique({
    where: { id: transactionId },
    include: {
      returns: true,
    },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  let netAmount = transaction.amount

  // Subtract returns
  if (transaction.returns.length > 0) {
    const totalReturns = transaction.returns.reduce(
      (sum, ret) => sum + Math.abs(ret.amount),
      0
    )
    netAmount -= totalReturns
  }

  return Math.max(0, netAmount) // Never negative
}

/**
 * Calculate net sales for a project over a period
 */
export async function calculateProjectNetSales(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const sales = await prisma.salesTransaction.findMany({
    where: {
      projectId,
      transactionType: 'SALE',
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      returns: true,
    },
  })

  let totalNet = 0

  for (const sale of sales) {
    const netAmount = await calculateNetSalesAmount(sale.id)
    totalNet += netAmount
  }

  return totalNet
}
