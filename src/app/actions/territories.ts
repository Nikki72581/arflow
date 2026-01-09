'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const territorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
})

type TerritoryInput = z.infer<typeof territorySchema>

async function getOrganizationId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { organizationId: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user.organizationId
}

export async function createTerritory(data: TerritoryInput) {
  try {
    const organizationId = await getOrganizationId()
    const validatedData = territorySchema.parse(data)

    const territory = await prisma.territory.create({
      data: {
        ...validatedData,
        organizationId,
      },
    })

    revalidatePath('/dashboard/settings/territories')

    return {
      success: true,
      data: territory,
    }
  } catch (error) {
    console.error('Error creating territory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create territory',
    }
  }
}

export async function getTerritories() {
  try {
    const organizationId = await getOrganizationId()

    const territories = await prisma.territory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    })

    return {
      success: true,
      data: territories,
    }
  } catch (error) {
    console.error('Error fetching territories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch territories',
    }
  }
}

export async function updateTerritory(id: string, data: TerritoryInput) {
  try {
    const organizationId = await getOrganizationId()
    const validatedData = territorySchema.parse(data)

    const territory = await prisma.territory.updateMany({
      where: {
        id,
        organizationId,
      },
      data: validatedData,
    })

    if (territory.count === 0) {
      throw new Error('Territory not found')
    }

    revalidatePath('/dashboard/settings/territories')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error updating territory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update territory',
    }
  }
}

export async function deleteTerritory(id: string) {
  try {
    const organizationId = await getOrganizationId()

    // Check if territory is in use
    const territory = await prisma.territory.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    })

    if (!territory) {
      throw new Error('Territory not found')
    }

    if (territory._count.clients > 0) {
      throw new Error(
        `Cannot delete territory. It is assigned to ${territory._count.clients} client(s).`
      )
    }

    await prisma.territory.delete({
      where: { id },
    })

    revalidatePath('/dashboard/settings/territories')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting territory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete territory',
    }
  }
}
