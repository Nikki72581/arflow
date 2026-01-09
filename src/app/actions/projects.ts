'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations/project'
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validations/project'

/**
 * Get organization ID for current user
 */
async function getOrganizationId(): Promise<string> {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { organizationId: true },
  })

  if (!user?.organizationId) {
    throw new Error('User not associated with an organization')
  }

  return user.organizationId
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectInput) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = createProjectSchema.parse(data)

    // Verify client belongs to organization
    const client = await prisma.client.findFirst({
      where: {
        id: validatedData.clientId,
        organizationId,
      },
    })

    if (!client) {
      throw new Error('Client not found')
    }

    // Convert date strings to Date objects if needed
    const projectData = {
      ...validatedData,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      organizationId,
    }

    // Create project
    const project = await prisma.project.create({
      data: projectData,
      include: {
        client: true,
      },
    })

    revalidatePath('/dashboard/projects')
    revalidatePath('/dashboard/clients')
    revalidatePath(`/dashboard/clients/${validatedData.clientId}`)
    
    return {
      success: true,
      data: project,
    }
  } catch (error) {
    console.error('Error creating project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project',
    }
  }
}

/**
 * Get all projects for the organization
 */
export async function getProjects() {
  try {
    const organizationId = await getOrganizationId()

    const projects = await prisma.project.findMany({
      where: {
        organizationId,
      },
      include: {
        client: true,
        commissionPlans: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            salesTransactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: projects,
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects',
    }
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string) {
  try {
    const organizationId = await getOrganizationId()

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        client: true,
        commissionPlans: {
          include: {
            rules: true,
          },
        },
        salesTransactions: {
          include: {
            user: true,
          },
          orderBy: {
            transactionDate: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!project) {
      throw new Error('Project not found')
    }

    return {
      success: true,
      data: project,
    }
  } catch (error) {
    console.error('Error fetching project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch project',
    }
  }
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, data: UpdateProjectInput) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = updateProjectSchema.parse(data)

    // Verify project belongs to organization
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    })

    if (!existingProject) {
      throw new Error('Project not found')
    }

    // If changing client, verify new client belongs to organization
    if (validatedData.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: validatedData.clientId,
          organizationId,
        },
      })

      if (!client) {
        throw new Error('Client not found')
      }
    }

    // Convert date strings to Date objects if needed
    const updateData = {
      ...validatedData,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
    }

    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        client: true,
      },
    })

    revalidatePath('/dashboard/projects')
    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/dashboard/clients/${project.clientId}`)
    
    return {
      success: true,
      data: project,
    }
  } catch (error) {
    console.error('Error updating project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update project',
    }
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify project belongs to organization
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        salesTransactions: true,
        commissionPlans: true,
      },
    })

    if (!existingProject) {
      throw new Error('Project not found')
    }

    // Check if project has transactions
    if (existingProject.salesTransactions.length > 0) {
      throw new Error('Cannot delete project with existing sales transactions')
    }

    // Delete project (will cascade delete commission plans due to schema)
    await prisma.project.delete({
      where: { id: projectId },
    })

    revalidatePath('/dashboard/projects')
    revalidatePath('/dashboard/clients')
    revalidatePath(`/dashboard/clients/${existingProject.clientId}`)
    
    return {
      success: true,
      message: 'Project deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting project:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete project',
    }
  }
}

/**
 * Get project statistics
 */
export async function getProjectStats() {
  try {
    const organizationId = await getOrganizationId()

    const [totalProjects, activeProjects, completedProjects] = await Promise.all([
      prisma.project.count({
        where: { organizationId },
      }),
      prisma.project.count({
        where: {
          organizationId,
          status: 'active',
        },
      }),
      prisma.project.count({
        where: {
          organizationId,
          status: 'completed',
        },
      }),
    ])

    return {
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        cancelledProjects: totalProjects - activeProjects - completedProjects,
      },
    }
  } catch (error) {
    console.error('Error fetching project stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    }
  }
}

/**
 * Get projects for a specific client
 */
export async function getClientProjects(clientId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify client belongs to organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
    })

    if (!client) {
      throw new Error('Client not found')
    }

    const projects = await prisma.project.findMany({
      where: {
        clientId,
        organizationId,
      },
      include: {
        commissionPlans: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            salesTransactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: projects,
    }
  } catch (error) {
    console.error('Error fetching client projects:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects',
    }
  }
}
