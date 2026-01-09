'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

interface CreateClientInput {
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  customerNumber?: string
  creditLimit?: number
  paymentTerms?: string
  notes?: string
  billingAddress1?: string
  billingAddress2?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  billingCountry?: string
  shippingAddress1?: string
  shippingAddress2?: string
  shippingCity?: string
  shippingState?: string
  shippingZip?: string
  shippingCountry?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'COLLECTIONS'
}

/**
 * Create a new customer
 */
export async function createClient(input: CreateClientInput) {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can create customers' }
    }

    const customer = await prisma.customer.create({
      data: {
        ...input,
        organizationId: user.organizationId,
        status: input.status ?? 'ACTIVE',
        currentBalance: 0,
        portalEnabled: false,
      },
    })

    revalidatePath('/dashboard/clients')
    revalidatePath('/dashboard/customers')

    return {
      success: true,
      data: customer,
      message: 'Customer created successfully',
    }
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return { success: false, error: error.message || 'Failed to create customer' }
  }
}

/**
 * Update an existing customer
 */
export async function updateClient(id: string, input: Partial<CreateClientInput> & {
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'COLLECTIONS'
  portalEnabled?: boolean
}) {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can update customers' }
    }

    // Verify customer belongs to org
    const existing = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existing || existing.organizationId !== user.organizationId) {
      return { success: false, error: 'Customer not found' }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: input,
    })

    revalidatePath('/dashboard/clients')
    revalidatePath('/dashboard/customers')
    revalidatePath(`/dashboard/clients/${id}`)

    return {
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    }
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return { success: false, error: error.message || 'Failed to update customer' }
  }
}

/**
 * Delete a customer
 */
export async function deleteClient(id: string) {
  try {
    const user = await getCurrentUserWithOrg()

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can delete customers' }
    }

    // Verify customer belongs to org
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: {
        arDocuments: { take: 1 },
        payments: { take: 1 },
      },
    })

    if (!existing || existing.organizationId !== user.organizationId) {
      return { success: false, error: 'Customer not found' }
    }

    // Check if customer has documents or payments
    if (existing.arDocuments.length > 0 || existing.payments.length > 0) {
      return {
        success: false,
        error: 'Cannot delete customer with existing invoices or payments. Consider marking them as inactive instead.',
      }
    }

    await prisma.customer.delete({
      where: { id },
    })

    revalidatePath('/dashboard/clients')
    revalidatePath('/dashboard/customers')

    return {
      success: true,
      message: 'Customer deleted successfully',
    }
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return { success: false, error: error.message || 'Failed to delete customer' }
  }
}

/**
 * Get all customers for organization
 */
export async function getClients() {
  try {
    const user = await getCurrentUserWithOrg()

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        _count: {
          select: {
            arDocuments: true,
            payments: true,
          },
        },
      },
      orderBy: {
        companyName: 'asc',
      },
    })

    return {
      success: true,
      data: customers,
    }
  } catch (error: any) {
    console.error('Error getting customers:', error)
    return { success: false, error: error.message || 'Failed to get customers' }
  }
}

/**
 * Get single customer by ID
 */
export async function getClient(id: string) {
  try {
    const user = await getCurrentUserWithOrg()

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        arDocuments: {
          orderBy: { documentDate: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            arDocuments: true,
            payments: true,
          },
        },
      },
    })

    if (!customer || customer.organizationId !== user.organizationId) {
      return { success: false, error: 'Customer not found' }
    }

    return {
      success: true,
      data: customer,
    }
  } catch (error: any) {
    console.error('Error getting customer:', error)
    return { success: false, error: error.message || 'Failed to get customer' }
  }
}
