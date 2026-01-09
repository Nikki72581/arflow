'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClientSchema, updateClientSchema } from '@/lib/validations/client'
import type { CreateClientInput, UpdateClientInput } from '@/lib/validations/client'

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
 * Create a new client
 */
export async function createClient(data: CreateClientInput) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = createClientSchema.parse(data)

    // Create client
    const client = await prisma.client.create({
      data: {
        ...validatedData,
        organizationId,
      },
    })

    revalidatePath('/dashboard/clients')
    
    return {
      success: true,
      data: client,
    }
  } catch (error) {
    console.error('Error creating client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create client',
    }
  }
}

/**
 * Get all clients for the organization
 */
export async function getClients() {
  try {
    const organizationId = await getOrganizationId()

    const clients = await prisma.client.findMany({
      where: {
        organizationId,
      },
      include: {
        projects: {
          select: {
            id: true,
            status: true,
          },
        },
        territory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: clients,
    }
  } catch (error) {
    console.error('Error fetching clients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clients',
    }
  }
}

/**
 * Get a single client by ID
 */
export async function getClient(clientId: string) {
  try {
    const organizationId = await getOrganizationId()

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      include: {
        projects: {
          include: {
            commissionPlans: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        territory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!client) {
      throw new Error('Client not found')
    }

    return {
      success: true,
      data: client,
    }
  } catch (error) {
    console.error('Error fetching client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch client',
    }
  }
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, data: UpdateClientInput) {
  try {
    const organizationId = await getOrganizationId()
    
    // Validate input
    const validatedData = updateClientSchema.parse(data)

    // Verify client belongs to organization
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
    })

    if (!existingClient) {
      throw new Error('Client not found')
    }

    // Update client (integration fields like externalId, externalSystem are preserved - not in updateClientSchema)
    const client = await prisma.client.update({
      where: { id: clientId },
      data: validatedData,
    })

    revalidatePath('/dashboard/clients')
    revalidatePath(`/dashboard/clients/${clientId}`)
    
    return {
      success: true,
      data: client,
    }
  } catch (error) {
    console.error('Error updating client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update client',
    }
  }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string) {
  try {
    const organizationId = await getOrganizationId()

    // Verify client belongs to organization
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      include: {
        projects: true,
      },
    })

    if (!existingClient) {
      throw new Error('Client not found')
    }

    // Check if client has projects
    if (existingClient.projects.length > 0) {
      throw new Error('Cannot delete client with existing projects')
    }

    // Delete client
    await prisma.client.delete({
      where: { id: clientId },
    })

    revalidatePath('/dashboard/clients')
    
    return {
      success: true,
      message: 'Client deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete client',
    }
  }
}

/**
 * Get client statistics
 */
export async function getClientStats() {
  try {
    const organizationId = await getOrganizationId()

    const [totalClients, clientsWithProjects] = await Promise.all([
      prisma.client.count({
        where: { organizationId },
      }),
      prisma.client.count({
        where: {
          organizationId,
          projects: {
            some: {},
          },
        },
      }),
    ])

    return {
      success: true,
      data: {
        totalClients,
        clientsWithProjects,
        clientsWithoutProjects: totalClients - clientsWithProjects,
      },
    }
  } catch (error) {
    console.error('Error fetching client stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    }
  }
}