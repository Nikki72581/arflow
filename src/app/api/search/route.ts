import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

type SearchResult = {
  type: 'client' | 'project' | 'sale' | 'commission' | 'plan' | 'team' | 'payout'
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

    // Search Clients
    const clients = await prisma.client.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        _count: {
          select: { projects: true }
        }
      }
    })

    clients.forEach(client => {
      results.push({
        type: 'client',
        id: client.id,
        title: client.name,
        subtitle: client.email || undefined,
        metadata: {
          projects: `${client._count.projects} project${client._count.projects !== 1 ? 's' : ''}`,
          ...(client.phone ? { phone: client.phone } : {})
        },
        href: `/dashboard/clients/${client.id}`
      })
    })

    // Search Projects
    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 10,
      include: {
        client: {
          select: { name: true }
        }
      }
    })

    projects.forEach(project => {
      results.push({
        type: 'project',
        id: project.id,
        title: project.name,
        subtitle: project.client.name,
        description: project.description || undefined,
        metadata: {
          status: project.status.toLowerCase()
        },
        href: `/dashboard/projects?client=${project.clientId}`
      })
    })

    // Search Sales Transactions
    const sales = await prisma.salesTransaction.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { description: { contains: query, mode: 'insensitive' } },
          { invoiceNumber: { contains: query, mode: 'insensitive' } },
          { project: { name: { contains: query, mode: 'insensitive' } } },
          { project: { client: { name: { contains: query, mode: 'insensitive' } } } },
          { user: { firstName: { contains: query, mode: 'insensitive' } } },
          { user: { lastName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 10,
      include: {
        project: {
          include: {
            client: {
              select: { name: true }
            }
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    sales.forEach(sale => {
      const salespersonName = `${sale.user.firstName} ${sale.user.lastName}`
      const clientName = sale.project?.client.name || 'No Client'
      const projectName = sale.project?.name || 'No Project'
      results.push({
        type: 'sale',
        id: sale.id,
        title: sale.description || `Sale #${sale.invoiceNumber || sale.id.slice(0, 8)}`,
        subtitle: `${clientName} - ${projectName}`,
        metadata: {
          amount: `$${sale.amount.toLocaleString()}`,
          salesperson: salespersonName,
          date: new Date(sale.transactionDate).toLocaleDateString()
        },
        href: `/dashboard/sales`
      })
    })

    // Search Commission Plans
    const plans = await prisma.commissionPlan.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10
    })

    plans.forEach(plan => {
      results.push({
        type: 'plan',
        id: plan.id,
        title: plan.name,
        description: plan.description || undefined,
        metadata: {
          status: plan.isActive ? 'active' : 'inactive'
        },
        href: `/dashboard/plans/${plan.id}`
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

    // Search Commissions
    const commissions = await prisma.commissionCalculation.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { user: { firstName: { contains: query, mode: 'insensitive' } } },
          { user: { lastName: { contains: query, mode: 'insensitive' } } },
          { salesTransaction: { project: { name: { contains: query, mode: 'insensitive' } } } },
          { salesTransaction: { project: { client: { name: { contains: query, mode: 'insensitive' } } } } },
          { commissionPlan: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        salesTransaction: {
          include: {
            project: {
              include: {
                client: {
                  select: { name: true }
                }
              }
            }
          }
        },
        commissionPlan: {
          select: { name: true }
        }
      }
    })

    commissions.forEach(commission => {
      const salespersonName = `${commission.user.firstName} ${commission.user.lastName}`
      const clientName = commission.salesTransaction.project?.client.name || 'No Client'
      const projectName = commission.salesTransaction.project?.name || 'No Project'
      results.push({
        type: 'commission',
        id: commission.id,
        title: `${salespersonName} - $${commission.amount.toLocaleString()}`,
        subtitle: `${clientName} - ${projectName}`,
        metadata: {
          plan: commission.commissionPlan.name,
          status: commission.status.toLowerCase()
        },
        href: `/dashboard/commissions`
      })
    })

    // Search Payouts
    const payouts = await prisma.payout.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { user: { firstName: { contains: query, mode: 'insensitive' } } },
          { user: { lastName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    payouts.forEach(payout => {
      const recipientName = `${payout.user.firstName} ${payout.user.lastName}`
      results.push({
        type: 'payout',
        id: payout.id,
        title: `Payout to ${recipientName}`,
        subtitle: `$${payout.amount.toLocaleString()}`,
        metadata: {
          status: payout.status.toLowerCase(),
          date: payout.paymentDate ? new Date(payout.paymentDate).toLocaleDateString() : 'Pending'
        },
        href: `/dashboard/commissions/payouts`
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
