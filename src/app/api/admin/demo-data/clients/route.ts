// src/app/api/admin/demo-data/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { faker } from '@faker-js/faker'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and verify admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, organizationId: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { count = 10 } = await req.json()

    // Generate clients
    const clients = []
    for (let i = 0; i < count; i++) {
      const client = await prisma.client.create({
        data: {
          name: faker.company.name(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
          organizationId: user.organizationId,
        },
      })
      clients.push(client)
    }

    return NextResponse.json({ 
      success: true, 
      count: clients.length,
      clients: clients.map(c => ({ id: c.id, name: c.name }))
    })
  } catch (error: any) {
    console.error('Error generating clients:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}