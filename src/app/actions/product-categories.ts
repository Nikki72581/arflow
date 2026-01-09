'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const productCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
})

type ProductCategoryInput = z.infer<typeof productCategorySchema>

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

export async function createProductCategory(data: ProductCategoryInput) {
  try {
    const organizationId = await getOrganizationId()
    const validatedData = productCategorySchema.parse(data)

    const category = await prisma.productCategory.create({
      data: {
        ...validatedData,
        organizationId,
      },
    })

    revalidatePath('/dashboard/settings/product-categories')

    return {
      success: true,
      data: category,
    }
  } catch (error) {
    console.error('Error creating product category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product category',
    }
  }
}

export async function getProductCategories() {
  try {
    const organizationId = await getOrganizationId()

    const categories = await prisma.productCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { salesTransactions: true },
        },
      },
    })

    return {
      success: true,
      data: categories,
    }
  } catch (error) {
    console.error('Error fetching product categories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product categories',
    }
  }
}

export async function updateProductCategory(id: string, data: ProductCategoryInput) {
  try {
    const organizationId = await getOrganizationId()
    const validatedData = productCategorySchema.parse(data)

    const category = await prisma.productCategory.updateMany({
      where: {
        id,
        organizationId,
      },
      data: validatedData,
    })

    if (category.count === 0) {
      throw new Error('Product category not found')
    }

    revalidatePath('/dashboard/settings/product-categories')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error updating product category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product category',
    }
  }
}

export async function deleteProductCategory(id: string) {
  try {
    const organizationId = await getOrganizationId()

    // Check if category is in use
    const category = await prisma.productCategory.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: { salesTransactions: true },
        },
      },
    })

    if (!category) {
      throw new Error('Product category not found')
    }

    if (category._count.salesTransactions > 0) {
      throw new Error(
        `Cannot delete category. It is used by ${category._count.salesTransactions} sales transaction(s).`
      )
    }

    await prisma.productCategory.delete({
      where: { id },
    })

    revalidatePath('/dashboard/settings/product-categories')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting product category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete product category',
    }
  }
}
