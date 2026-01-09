import { prisma } from '@/lib/db'

/**
 * Calculate net sales amount (gross - returns/credits)
 */
export async function calculateNetSalesAmount(
  documentId: string
): Promise<number> {
  const document = await prisma.arDocument.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  const netAmount =
    document.documentType === 'CREDIT_MEMO' ? -document.totalAmount : document.totalAmount

  return Math.max(0, netAmount) // Never negative
}

/**
 * Calculate net sales for a customer over a period
 */
export async function calculateProjectNetSales(
  customerId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const documents = await prisma.arDocument.findMany({
    where: {
      customerId,
      status: {
        not: 'VOID',
      },
      documentDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  let totalNet = 0

  for (const document of documents) {
    const netAmount = await calculateNetSalesAmount(document.id)
    totalNet += netAmount
  }

  return totalNet
}
