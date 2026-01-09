import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'

/**
 * Integration tests for multi-tenant data isolation
 *
 * These tests verify that:
 * 1. Data is properly isolated between organizations
 * 2. Server actions enforce organizationId from auth context
 * 3. Malicious attempts to access other org data are blocked
 *
 * Note: These tests use mocked Prisma. For true integration testing,
 * consider setting up a test database and using real Prisma queries.
 */

describe('Multi-Tenant Data Isolation', () => {
  const ORG_1_ID = 'org-1'
  const ORG_2_ID = 'org-2'
  const USER_1_ID = 'user-1'
  const USER_2_ID = 'user-2'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Client Isolation', () => {
    it('should only return clients for the authenticated user organization', async () => {
      const org1Clients = [
        { id: 'client-1', name: 'Client 1', organizationId: ORG_1_ID },
        { id: 'client-2', name: 'Client 2', organizationId: ORG_1_ID },
      ]

      // Mock Prisma to return only org1 clients
      vi.mocked(prisma.client.findMany).mockResolvedValue(org1Clients as any)

      // Import the server action
      const { getClients } = await import('@/app/actions/clients')

      // Mock auth to return user from ORG_1
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      const result = await getClients()

      // Verify Prisma was called with organizationId filter
      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_1_ID,
          }),
        })
      )

      // Should only get org1 clients
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.every((c: any) => c.organizationId === ORG_1_ID)).toBe(true)
    })

    it('should prevent access to clients from other organizations', async () => {
      // Attempt to get a client from ORG_2 while authenticated as ORG_1 user
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      // Mock finding a client from ORG_2 (should not happen in real scenario)
      vi.mocked(prisma.client.findFirst).mockResolvedValue(null)

      const { deleteClient } = await import('@/app/actions/clients')

      // Try to delete client from ORG_2
      const result = await deleteClient('client-from-org-2')

      // Verify the query filtered by organizationId
      expect(prisma.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'client-from-org-2',
            organizationId: ORG_1_ID, // Should filter by authenticated user's org
          }),
        })
      )

      // Should fail because client not found in ORG_1
      expect(result.success).toBe(false)
    })
  })

  describe('Project Isolation', () => {
    it('should only return projects for the authenticated user organization', async () => {
      const org1Projects = [
        {
          id: 'project-1',
          name: 'Project 1',
          organizationId: ORG_1_ID,
          clientId: 'client-1',
        },
        {
          id: 'project-2',
          name: 'Project 2',
          organizationId: ORG_1_ID,
          clientId: 'client-1',
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.project.findMany).mockResolvedValue(org1Projects as any)

      const { getProjects } = await import('@/app/actions/projects')

      const result = await getProjects()

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.every((p: any) => p.organizationId === ORG_1_ID)).toBe(true)
    })

    it('should prevent cross-organization project access', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.project.findFirst).mockResolvedValue(null)

      const { updateProject } = await import('@/app/actions/projects')

      const result = await updateProject('project-from-org-2', {
        name: 'Hacked Project',
      })

      expect(prisma.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'project-from-org-2',
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(false)
    })
  })

  describe('Commission Plan Isolation', () => {
    it('should only return commission plans for the authenticated organization', async () => {
      const org1Plans = [
        {
          id: 'plan-1',
          name: 'Standard Sales Plan',
          organizationId: ORG_1_ID,
        },
        { id: 'plan-2', name: 'VIP Plan', organizationId: ORG_1_ID },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.commissionPlan.findMany).mockResolvedValue(
        org1Plans as any
      )

      const { getCommissionPlans } = await import(
        '@/app/actions/commission-plans'
      )

      const result = await getCommissionPlans()

      expect(prisma.commissionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.every((p: any) => p.organizationId === ORG_1_ID)).toBe(true)
    })

    it('should prevent accessing commission plans from other organizations', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.commissionPlan.findFirst).mockResolvedValue(null)

      const { deleteCommissionPlan } = await import(
        '@/app/actions/commission-plans'
      )

      const result = await deleteCommissionPlan('plan-from-org-2')

      expect(prisma.commissionPlan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'plan-from-org-2',
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(false)
    })
  })

  describe('Sales Transaction Isolation', () => {
    it('should only return sales for the authenticated organization', async () => {
      const org1Sales = [
        {
          id: 'sale-1',
          amount: 10000,
          organizationId: ORG_1_ID,
          clientId: 'client-1',
        },
        {
          id: 'sale-2',
          amount: 15000,
          organizationId: ORG_1_ID,
          clientId: 'client-2',
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.salesTransaction.findMany).mockResolvedValue(
        org1Sales as any
      )

      const { getSalesTransactions } = await import(
        '@/app/actions/sales-transactions'
      )

      const result = await getSalesTransactions()

      expect(prisma.salesTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.every((s: any) => s.organizationId === ORG_1_ID)).toBe(true)
    })
  })

  describe('Commission Calculation Isolation', () => {
    it('should only return commissions for the authenticated organization', async () => {
      const org1Commissions = [
        {
          id: 'commission-1',
          amount: 1000,
          organizationId: ORG_1_ID,
          userId: USER_1_ID,
        },
        {
          id: 'commission-2',
          amount: 1500,
          organizationId: ORG_1_ID,
          userId: USER_1_ID,
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.commissionCalculation.findMany).mockResolvedValue(
        org1Commissions as any
      )

      const { getCommissionCalculations } = await import(
        '@/app/actions/commission-calculations'
      )

      const result = await getCommissionCalculations()

      expect(prisma.commissionCalculation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.every((c: any) => c.organizationId === ORG_1_ID)).toBe(
        true
      )
    })

    it('should prevent approving commissions from other organizations', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.commissionCalculation.findFirst).mockResolvedValue(null)

      const { approveCalculation } = await import(
        '@/app/actions/commission-calculations'
      )

      const result = await approveCalculation('commission-from-org-2')

      expect(prisma.commissionCalculation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'commission-from-org-2',
            organizationId: ORG_1_ID,
          }),
        })
      )

      expect(result.success).toBe(false)
    })
  })

  describe('Malicious Request Protection', () => {
    it('should ignore organizationId in request body and use auth context', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      vi.mocked(prisma.client.create).mockResolvedValue({
        id: 'new-client',
        name: 'New Client',
        organizationId: ORG_1_ID,
      } as any)

      const { createClient } = await import('@/app/actions/clients')

      // Malicious payload trying to set different organizationId
      const maliciousData = {
        name: 'Malicious Client',
        organizationId: ORG_2_ID, // Attacker tries to create in another org
      }

      await createClient(maliciousData as any)

      // Verify that the create call used ORG_1_ID from auth, not the malicious ORG_2_ID
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG_1_ID, // Should use authenticated org
          }),
        })
      )

      // Should NOT have been called with ORG_2_ID
      expect(prisma.client.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG_2_ID,
          }),
        })
      )
    })

    it('should require authentication for all server actions', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      // Mock unauthenticated state
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        sessionId: null,
        orgId: null,
      } as any)

      const { getClients } = await import('@/app/actions/clients')

      // Should return error when not authenticated
      const result = await getClients()
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/unauthorized/i)
    })

    it('should require organization association for all operations', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      // Mock authenticated but no org association
      vi.mocked(auth).mockResolvedValue({
        userId: 'user-without-org',
        sessionId: 'session-id',
        orgId: null,
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-without-org',
        clerkId: 'user-without-org',
        organizationId: null, // No org association
      } as any)

      const { getClients } = await import('@/app/actions/clients')

      // Should return error about missing organization
      const result = await getClients()
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not associated with an organization/i)
    })
  })

  describe('Cross-Organization Data Leakage Prevention', () => {
    it('should not leak client data through project relationships', async () => {
      // User from ORG_1 tries to get projects, which could expose client data from ORG_2
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      const org1Projects = [
        {
          id: 'project-1',
          name: 'Project 1',
          organizationId: ORG_1_ID,
          clientId: 'client-1',
          client: {
            id: 'client-1',
            name: 'Client 1',
            organizationId: ORG_1_ID,
          },
        },
      ]

      vi.mocked(prisma.project.findMany).mockResolvedValue(
        org1Projects as any
      )

      const { getProjects } = await import('@/app/actions/projects')

      const result = await getProjects()

      // Verify all related client data is also from ORG_1
      expect(result.success).toBe(true)
      result.data?.forEach((project: any) => {
        if (project.client) {
          expect(project.client.organizationId).toBe(ORG_1_ID)
        }
      })
    })

    it('should not leak commission plan data through commission calculations', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_1_ID,
        clerkId: 'test-clerk-user-id',
        organizationId: ORG_1_ID,
      } as any)

      const org1Commissions = [
        {
          id: 'commission-1',
          amount: 1000,
          organizationId: ORG_1_ID,
          userId: USER_1_ID,
          commissionPlanId: 'plan-1',
          commissionPlan: {
            id: 'plan-1',
            name: 'Plan 1',
            organizationId: ORG_1_ID,
          },
        },
      ]

      vi.mocked(prisma.commissionCalculation.findMany).mockResolvedValue(
        org1Commissions as any
      )

      const { getCommissionCalculations } = await import(
        '@/app/actions/commission-calculations'
      )

      const result = await getCommissionCalculations()

      // Verify all related plan data is also from ORG_1
      expect(result.success).toBe(true)
      result.data?.forEach((commission: any) => {
        if (commission.commissionPlan) {
          expect(commission.commissionPlan.organizationId).toBe(ORG_1_ID)
        }
      })
    })
  })
})
