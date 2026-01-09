import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSalesTransaction } from '@/app/actions/sales-transactions'
import { createClient } from '@/app/actions/clients'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // Validate required fields
    if (!data.amount || !data.transactionDate || !data.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, transactionDate, userId' },
        { status: 400 }
      )
    }

    // Get organization ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    })

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    // Handle automatic client creation if clientName is provided but no clientId
    let clientId = data.clientId
    if (data.clientName && !clientId) {
      // Check if client already exists by name (case-insensitive)
      const existingClient = await prisma.client.findFirst({
        where: {
          organizationId: user.organizationId,
          name: {
            equals: data.clientName.trim(),
            mode: 'insensitive',
          },
        },
      })

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Create new client automatically
        const newClientResult = await createClient({
          name: data.clientName.trim(),
          status: 'ACTIVE',
          tier: 'STANDARD',
        })

        if (newClientResult.success && newClientResult.data) {
          clientId = newClientResult.data.id
        } else {
          return NextResponse.json(
            { error: `Failed to create client: ${newClientResult.error}` },
            { status: 400 }
          )
        }
      }
    }

    // Create the sales transaction using the existing action
    const result = await createSalesTransaction({
      amount: parseFloat(data.amount),
      transactionDate: data.transactionDate,
      userId: data.userId,
      projectId: data.projectId || undefined,
      clientId: clientId || undefined,
      productCategoryId: data.productCategoryId || undefined,
      invoiceNumber: data.invoiceNumber || undefined,
      description: data.description || undefined,
      transactionType: data.transactionType || 'SALE',
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to create transaction' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
