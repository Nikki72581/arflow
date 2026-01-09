// src/app/api/admin/demo-data/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { faker } from '@faker-js/faker'

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

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

    // Get existing clients to link projects to
    const clients = await prisma.client.findMany({
      where: { organizationId: user.organizationId },
    })

    if (clients.length === 0) {
      return NextResponse.json({ 
        error: 'No clients found. Please generate clients first.' 
      }, { status: 400 })
    }

    const projectTemplates = [
      { name: 'Website Redesign', desc: 'Complete website overhaul with modern design' },
      { name: 'Enterprise Software Implementation', desc: 'Deploy and configure enterprise solution' },
      { name: 'Cloud Migration', desc: 'Migrate infrastructure to cloud platform' },
      { name: 'Marketing Campaign', desc: 'Multi-channel marketing campaign' },
      { name: 'Mobile App Development', desc: 'Native mobile application development' },
      { name: 'SEO Optimization', desc: 'Search engine optimization project' },
      { name: 'Security Audit', desc: 'Comprehensive security assessment' },
      { name: 'Data Analytics Platform', desc: 'Business intelligence and analytics setup' },
      { name: 'E-commerce Integration', desc: 'Online store setup and integration' },
      { name: 'CRM Implementation', desc: 'Customer relationship management system' },
    ]

    // Generate projects
    const projects = []
    for (let i = 0; i < count; i++) {
      const client = randomItem(clients)
      const template = randomItem(projectTemplates)
      const startDate = randomDate(new Date('2024-01-01'), new Date('2024-06-01'))
      const hasEnded = Math.random() > 0.4
      const endDate = hasEnded ? randomDate(startDate, new Date('2024-12-31')) : null
      const status = hasEnded && Math.random() > 0.3 ? 'completed' : 'active'

      const project = await prisma.project.create({
        data: {
          name: `${client.name.split(' ')[0]} - ${template.name}`,
          description: template.desc,
          clientId: client.id,
          organizationId: user.organizationId,
          startDate,
          endDate,
          status,
        },
      })
      projects.push(project)
    }

    return NextResponse.json({ 
      success: true, 
      count: projects.length,
      projects: projects.map(p => ({ id: p.id, name: p.name, status: p.status }))
    })
  } catch (error: any) {
    console.error('Error generating projects:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}