import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

type SearchResult = {
  type: 'client' | 'invoice' | 'payment' | 'team'
  id: string
  title: string
  subtitle?: string
  description?: string
  metadata?: Record<string, string>
  href: string
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'User not associated with organization' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toLowerCase() || ''

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        query: query
      })
    }

    const orgId = user.organizationId
    const results: SearchResult[] = []

    // Search Customers
    const clients = await prisma.customer.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { companyName: { contains: query, mode: 'insensitive' } },
          { contactName: { contains: query, mode: 'insensitive' } },
          { customerNumber: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        currentBalance: true,
        _count: {
          select: { arDocuments: true }
        }
      }
    })

    clients.forEach(client => {
      results.push({
        type: 'client',
        id: client.id,
        title: client.companyName,
        subtitle: client.contactName || client.email || undefined,
        metadata: {
          invoices: `${client._count.arDocuments} invoice${client._count.arDocuments !== 1 ? 's' : ''}`,
          balance: `$${client.currentBalance.toLocaleString()}`,
          ...(client.phone ? { phone: client.phone } : {})
        },
        href: `/dashboard/clients/${client.id}`
      })
    })

    // Search Invoices
    const invoices = await prisma.arDocument.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { documentNumber: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { customer: { companyName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 10,
      include: {
        customer: {
          select: { companyName: true }
        }
      }
    })

    invoices.forEach(invoice => {
      const invoiceTitle = invoice.documentNumber
        ? `Invoice ${invoice.documentNumber}`
        : `Invoice ${invoice.id.slice(0, 8)}`
      results.push({
        type: 'invoice',
        id: invoice.id,
        title: invoiceTitle,
        subtitle: invoice.customer.companyName,
        description: invoice.description || undefined,
        metadata: {
          amount: `$${invoice.totalAmount.toLocaleString()}`,
          status: invoice.status.toLowerCase(),
          date: new Date(invoice.documentDate).toLocaleDateString()
        },
        href: `/dashboard/clients/${invoice.customerId}`
      })
    })

    // Search Payments
    const payments = await prisma.customerPayment.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { paymentNumber: { contains: query, mode: 'insensitive' } },
          { referenceNumber: { contains: query, mode: 'insensitive' } },
          { customer: { companyName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 10,
      include: {
        customer: {
          select: {
            companyName: true
          }
        }
      }
    })

    payments.forEach(payment => {
      const paymentTitle = payment.paymentNumber
        ? `Payment ${payment.paymentNumber}`
        : `Payment ${payment.id.slice(0, 8)}`
      results.push({
        type: 'payment',
        id: payment.id,
        title: paymentTitle,
        subtitle: payment.customer.companyName,
        metadata: {
          amount: `$${payment.amount.toLocaleString()}`,
          status: payment.status.toLowerCase(),
          date: new Date(payment.paymentDate).toLocaleDateString()
        },
        href: `/dashboard/clients/${payment.customerId}`
      })
    })

    // Search Team Members
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    })

    teamMembers.forEach(member => {
      results.push({
        type: 'team',
        id: member.id,
        title: `${member.firstName} ${member.lastName}`,
        subtitle: member.email,
        metadata: {
          role: member.role.toLowerCase()
        },
        href: `/dashboard/team`
      })
    })

    return NextResponse.json({
      success: true,
      data: results,
      query: query,
      totalResults: results.length
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform search'
      },
      { status: 500 }
    )
  }
}
