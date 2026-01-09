'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createAcumaticaClient } from '@/lib/acumatica/client'
import { decryptPasswordCredentials } from '@/lib/acumatica/encryption'
import { createAuditLog } from '@/lib/audit-log'
import { calculateNetSalesAmount } from '@/lib/net-sales-calculator'
import {
  calculateCommissionWithPrecedence,
  type CalculationContext,
  type ScopedCommissionRule,
} from '@/lib/commission-calculator'
import type {
  AcumaticaInvoice,
  AcumaticaInvoiceLine,
  InvoiceQueryFilters,
} from '@/lib/acumatica/types'
import type {
  CommissionPlan,
  CommissionRule,
  Client,
  Project,
  User,
  Prisma,
} from '@prisma/client'
import { syncAcumaticaInvoicesV2 } from './sync-v2'
import type { FieldMappingConfig, FilterConfig } from '@/lib/acumatica/config-types'

const ACUMATICA_SYSTEM = 'ACUMATICA'

interface SyncSummary {
  invoicesFetched: number
  invoicesProcessed: number
  invoicesSkipped: number
  salesCreated: number
  clientsCreated: number
  projectsCreated: number
  errorsCount: number
}

interface SyncLogDetails {
  id: string
  syncType: string
  status: string
  startedAt: string
  completedAt: string | null
  undoneAt: string | null
  triggeredBy: {
    id: string
    name: string | null
    email: string | null
  } | null
  invoicesFetched: number
  invoicesProcessed: number
  invoicesSkipped: number
  salesCreated: number
  clientsCreated: number
  projectsCreated: number
  errorsCount: number
  skipDetails: Array<{ invoiceRef: string; reason: string; debugData?: unknown }> | null
  errorDetails: Array<{ invoiceRef: string; error: string }> | null
}

function getTransactionType(docType: string) {
  if (docType === 'Credit Memo') return 'RETURN'
  if (docType === 'Debit Memo') return 'ADJUSTMENT'
  return 'SALE'
}

function getInvoiceAmount(invoice: AcumaticaInvoice, amountField: string) {
  // Always calculate from line items since Amount and DocTotal fields may not be available
  if (amountField === 'LINES_TOTAL' || amountField === 'DOC_TOTAL') {
    return (invoice.Details ?? []).reduce((sum, line) => sum + (line.ExtendedPrice?.value ?? line.Amount?.value ?? 0), 0)
  }
  // Default to sum of line amounts
  return (invoice.Details ?? []).reduce((sum, line) => sum + (line.ExtendedPrice?.value ?? line.Amount?.value ?? 0), 0)
}

function getLineAmount(line: AcumaticaInvoiceLine, amountField: string) {
  if (amountField === 'AMOUNT') return line.Amount?.value ?? 0
  return line.ExtendedPrice?.value ?? 0
}

async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { organization: true },
  })

  if (!user || !user.organization) {
    throw new Error('User organization not found')
  }

  if (user.role !== 'ADMIN') {
    throw new Error('Only admins can sync integrations')
  }

  return user
}

async function resolveCommissionPlan({
  organizationId,
  projectId,
  clientId,
  projectPlanCache,
  clientPlanCache,
  orgPlanCache,
}: {
  organizationId: string
  projectId?: string | null
  clientId?: string | null
  projectPlanCache: Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>
  clientPlanCache: Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>
  orgPlanCache: { value?: (CommissionPlan & { rules: CommissionRule[] }) | null }
}) {
  if (projectId) {
    if (!projectPlanCache.has(projectId)) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId },
        include: {
          commissionPlans: {
            where: { isActive: true },
            include: { rules: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      projectPlanCache.set(projectId, project?.commissionPlans?.[0] ?? null)
    }

    const plan = projectPlanCache.get(projectId) ?? null
    if (plan) return plan
  }

  if (clientId) {
    if (!clientPlanCache.has(clientId)) {
      const clientPlan = await prisma.commissionPlan.findFirst({
        where: {
          organizationId,
          isActive: true,
          project: {
            clientId,
          },
        },
        include: { rules: true },
        orderBy: { createdAt: 'desc' },
      })
      clientPlanCache.set(clientId, clientPlan ?? null)
    }

    const plan = clientPlanCache.get(clientId) ?? null
    if (plan) return plan
  }

  if (orgPlanCache.value === undefined) {
    const orgPlan = await prisma.commissionPlan.findFirst({
      where: { organizationId, isActive: true, projectId: null },
      include: { rules: true },
      orderBy: { createdAt: 'desc' },
    })
    orgPlanCache.value = orgPlan ?? null
  }

  return orgPlanCache.value ?? null
}

async function createCommissionCalculation({
  transactionId,
  transactionAmount,
  transactionDate,
  projectId,
  client,
  userId,
  organizationId,
  commissionPlan,
}: {
  transactionId: string
  transactionAmount: number
  transactionDate: Date
  projectId?: string | null
  client?: Client | null
  userId: string
  organizationId: string
  commissionPlan: (CommissionPlan & { rules: CommissionRule[] }) | null
}) {
  if (!commissionPlan || commissionPlan.rules.length === 0) {
    return null
  }

  const netAmount = await calculateNetSalesAmount(transactionId)

  const context: CalculationContext = {
    grossAmount: transactionAmount,
    netAmount,
    transactionDate,
    customerId: client?.id,
    customerTier: client?.tier,
    projectId: projectId || undefined,
    productCategoryId: undefined,
    territoryId: client?.territoryId || undefined,
    commissionBasis: commissionPlan.commissionBasis,
  }

  const result = calculateCommissionWithPrecedence(
    context,
    commissionPlan.rules as ScopedCommissionRule[]
  )

  const metadata = {
    basis: result.basis,
    basisAmount: result.basisAmount,
    grossAmount: transactionAmount,
    netAmount,
    context: {
      customerTier: client?.tier,
      customerId: client?.id,
      customerName: client?.name,
      projectId,
    },
    selectedRule: result.selectedRule,
    matchedRules: result.matchedRules,
    appliedRules: result.appliedRules,
    calculatedAt: new Date().toISOString(),
  }

  return prisma.commissionCalculation.create({
    data: {
      salesTransactionId: transactionId,
      userId,
      commissionPlanId: commissionPlan.id,
      amount: result.finalAmount,
      metadata,
      calculatedAt: new Date(),
      status: 'PENDING',
      organizationId,
    },
  })
}

async function resolveClient({
  integrationId,
  syncLogId,
  organizationId,
  customerIdSource,
  customerHandling,
  invoice,
  clientCache,
  acumaticaClient,
}: {
  integrationId: string
  syncLogId: string
  organizationId: string
  customerIdSource: string
  customerHandling: string
  invoice: AcumaticaInvoice
  clientCache: Map<string, Client>
  acumaticaClient: ReturnType<typeof createAcumaticaClient>
}) {
  const customerId = invoice.CustomerID.value
  let externalId = customerId
  let customerName = customerId

  if (customerIdSource === 'CUSTOMER_CD') {
    const customer = await acumaticaClient.fetchCustomer(customerId)
    externalId = customer.CustomerCD.value
    customerName = customer.CustomerName.value || customer.CustomerCD.value
  }

  const cacheKey = `${externalId}-${ACUMATICA_SYSTEM}`
  if (clientCache.has(cacheKey)) {
    return { client: clientCache.get(cacheKey)!, created: false, externalId }
  }

  const existingClient = await prisma.client.findUnique({
    where: {
      organizationId_externalId_externalSystem: {
        organizationId,
        externalId,
        externalSystem: ACUMATICA_SYSTEM,
      },
    },
  })

  if (existingClient) {
    clientCache.set(cacheKey, existingClient)
    return { client: existingClient, created: false, externalId }
  }

  if (customerHandling === 'SKIP') {
    return { client: null, created: false, externalId }
  }

  const createdClient = await prisma.client.create({
    data: {
      name: customerName,
      organizationId,
      clientId: externalId,
      externalId,
      externalSystem: ACUMATICA_SYSTEM,
      sourceType: 'INTEGRATION',
      createdByIntegrationId: integrationId,
      createdBySyncLogId: syncLogId,
    },
  })

  clientCache.set(cacheKey, createdClient)
  return { client: createdClient, created: true, externalId }
}

async function resolveProject({
  integrationId,
  syncLogId,
  organizationId,
  projectAutoCreate,
  noProjectHandling,
  invoice,
  client,
  projectCache,
  acumaticaClient,
  customerExternalId,
}: {
  integrationId: string
  syncLogId: string
  organizationId: string
  projectAutoCreate: boolean
  noProjectHandling: string
  invoice: AcumaticaInvoice
  client: Client | null
  projectCache: Map<string, Project>
  acumaticaClient: ReturnType<typeof createAcumaticaClient>
  customerExternalId: string
}) {
  const projectRef: string | undefined = undefined

  if (projectRef) {
    const cacheKey = `${projectRef}-${ACUMATICA_SYSTEM}`
    if (projectCache.has(cacheKey)) {
      return { project: projectCache.get(cacheKey)!, created: false }
    }

    const existingProject = await prisma.project.findUnique({
      where: {
        organizationId_externalId_externalSystem: {
          organizationId,
          externalId: projectRef,
          externalSystem: ACUMATICA_SYSTEM,
        },
      },
    })

    if (existingProject) {
      projectCache.set(cacheKey, existingProject)
      return { project: existingProject, created: false }
    }

    if (!projectAutoCreate || !client) {
      return { project: null, created: false }
    }

    const projectDetails = await acumaticaClient.fetchProject(projectRef)
    const projectName = projectDetails.Description.value || projectDetails.ProjectCD.value

    const createdProject = await prisma.project.create({
      data: {
        name: projectName,
        clientId: client.id,
        organizationId,
        externalId: projectRef,
        externalSystem: ACUMATICA_SYSTEM,
        sourceType: 'INTEGRATION',
        createdByIntegrationId: integrationId,
        createdBySyncLogId: syncLogId,
      },
    })

    projectCache.set(cacheKey, createdProject)
    return { project: createdProject, created: true }
  }

  if (noProjectHandling !== 'DEFAULT_PROJECT' || !client) {
    return { project: null, created: false }
  }

  const defaultExternalId = `DEFAULT:${customerExternalId}`
  const cacheKey = `${defaultExternalId}-${ACUMATICA_SYSTEM}`
  if (projectCache.has(cacheKey)) {
    return { project: projectCache.get(cacheKey)!, created: false }
  }

  const existingDefault = await prisma.project.findUnique({
    where: {
      organizationId_externalId_externalSystem: {
        organizationId,
        externalId: defaultExternalId,
        externalSystem: ACUMATICA_SYSTEM,
      },
    },
  })

  if (existingDefault) {
    projectCache.set(cacheKey, existingDefault)
    return { project: existingDefault, created: false }
  }

  const createdDefault = await prisma.project.create({
    data: {
      name: `${client.name} - Default Project`,
      clientId: client.id,
      organizationId,
      externalId: defaultExternalId,
      externalSystem: ACUMATICA_SYSTEM,
      sourceType: 'INTEGRATION',
      createdByIntegrationId: integrationId,
      createdBySyncLogId: syncLogId,
    },
  })

  projectCache.set(cacheKey, createdDefault)
  return { project: createdDefault, created: true }
}

async function buildTransactionUser({
  invoice,
  salespersonMap,
}: {
  invoice: AcumaticaInvoice
  salespersonMap: Map<string, User>
}) {
  const invoiceRef = invoice.ReferenceNbr?.value || 'Unknown'

  // Salesperson data is nested in Commissions.SalesPersons array
  const salespersons = invoice.Commissions?.SalesPersons
  if (!salespersons || salespersons.length === 0) {
    console.log(`[${invoiceRef}] No salespersons found in invoice.Commissions.SalesPersons`)
    console.log(`[${invoiceRef}] Invoice Commissions structure:`, JSON.stringify(invoice.Commissions, null, 2))
    return null
  }

  // Use the first salesperson if multiple exist
  const salespersonId = salespersons[0]?.SalespersonID?.value
  if (!salespersonId) {
    console.log(`[${invoiceRef}] SalespersonID is null or undefined`)
    console.log(`[${invoiceRef}] First salesperson data:`, JSON.stringify(salespersons[0], null, 2))
    return null
  }

  console.log(`[${invoiceRef}] Looking for SalespersonID: "${salespersonId}"`)
  console.log(`[${invoiceRef}] Available salesperson IDs in map:`, Array.from(salespersonMap.keys()))

  const user = salespersonMap.get(salespersonId)
  if (!user) {
    console.log(`[${invoiceRef}] No user found for SalespersonID: "${salespersonId}"`)
  } else {
    console.log(`[${invoiceRef}] Found user:`, { id: user.id, email: user.email, salespersonId: user.salespersonId })
  }

  return user ?? null
}

function filterInvoiceLines(lines: AcumaticaInvoiceLine[], mode: string, values: string[]) {
  if (mode === 'ALL') return lines
  if (mode === 'ITEM_CLASS') {
    return lines.filter((line) => values.includes(line.ItemClass?.value))
  }
  if (mode === 'GL_ACCOUNT') {
    return lines.filter((line) => values.includes(line.Account?.value))
  }
  return lines
}

/**
 * V1 Sync Function - Legacy hardcoded sync
 * This is kept for backward compatibility with existing v1 integrations.
 */
async function syncAcumaticaInvoicesV1() {
  let syncLogId: string | null = null
  let acumaticaClient: ReturnType<typeof createAcumaticaClient> | null = null

  try {
    const user = await getCurrentUser()
    const organizationId = user.organizationId

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId },
    })

    if (!integration) {
      return { success: false, error: 'Acumatica integration not found' }
    }

    if (!integration.encryptedCredentials) {
      return { success: false, error: 'Acumatica credentials are missing' }
    }

    if (!integration.invoiceStartDate) {
      return { success: false, error: 'Invoice start date is not configured' }
    }

    const credentials = decryptPasswordCredentials(integration.encryptedCredentials)
    acumaticaClient = createAcumaticaClient({
      instanceUrl: integration.instanceUrl,
      apiVersion: integration.apiVersion,
      companyId: integration.companyId,
      credentials: {
        type: 'password',
        username: credentials.username,
        password: credentials.password,
      },
    })

    const syncLog = await prisma.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType: 'MANUAL',
        status: 'STARTED',
        triggeredById: user.id,
      },
    })

    syncLogId = syncLog.id

    await acumaticaClient.authenticate()

    const filters: InvoiceQueryFilters = {
      startDate: integration.invoiceStartDate,
      endDate: integration.invoiceEndDate ?? undefined,
      includeInvoices: integration.includeInvoices ?? true,
      includeCreditMemos: integration.includeCreditMemos ?? false,
      includeDebitMemos: integration.includeDebitMemos ?? false,
      branches:
        integration.branchFilterMode === 'SELECTED'
          ? ((integration.selectedBranches as string[]) || [])
          : [],
    }

    const invoices = await acumaticaClient.fetchInvoices(filters)

    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: { status: 'IN_PROGRESS' },
    })

    // Auto-create placeholder users for any PLACEHOLDER mappings without users
    const placeholderMappings = await prisma.acumaticaSalespersonMapping.findMany({
      where: {
        integrationId: integration.id,
        status: 'PLACEHOLDER',
        userId: null,
      },
    })

    console.log(`[Sync] Found ${placeholderMappings.length} placeholder mappings without users`)
    if (placeholderMappings.length > 0) {
      console.log('[Sync] Placeholder mappings:', placeholderMappings.map(m => ({
        id: m.id,
        salespersonId: m.acumaticaSalespersonId,
        name: m.acumaticaSalespersonName,
        email: m.acumaticaEmail
      })))

      const createdUsers = await prisma.$transaction(
        placeholderMappings.map((mapping) =>
          prisma.user.create({
            data: {
              email: mapping.acumaticaEmail || `${mapping.acumaticaSalespersonId.toLowerCase()}@placeholder.local`,
              firstName: mapping.acumaticaSalespersonName.split(' ')[0] || null,
              lastName: mapping.acumaticaSalespersonName.split(' ').slice(1).join(' ') || null,
              role: 'SALESPERSON',
              organizationId,
              isPlaceholder: true,
              clerkId: null,
              salespersonId: mapping.acumaticaSalespersonId,
              invitedAt: null,
            },
          })
        )
      )

      console.log(`[Sync] Created ${createdUsers.length} placeholder users`)

      await Promise.all(
        placeholderMappings.map((mapping, index) =>
          prisma.acumaticaSalespersonMapping.update({
            where: { id: mapping.id },
            data: {
              userId: createdUsers[index].id,
              matchType: 'AUTO_PLACEHOLDER',
            },
          })
        )
      )

      console.log('[Sync] Updated placeholder mappings with user IDs')
    }

    const salespersonMap = new Map<string, User>()
    const mappingsWithUsers = await prisma.acumaticaSalespersonMapping.findMany({
      where: {
        integrationId: integration.id,
        status: { not: 'IGNORED' },
        userId: { not: null },
      },
      select: {
        acumaticaSalespersonId: true,
        userId: true,
        status: true,
        matchType: true,
      },
    })

    console.log(`[Sync] Found ${mappingsWithUsers.length} salesperson mappings with users`)
    console.log('[Sync] Mappings:', mappingsWithUsers.map(m => ({
      salespersonId: m.acumaticaSalespersonId,
      userId: m.userId,
      status: m.status,
      matchType: m.matchType
    })))

    const mappedUserIds = mappingsWithUsers
      .map((mapping) => mapping.userId)
      .filter((id): id is string => Boolean(id))

    const mappedUsers = await prisma.user.findMany({
      where: { id: { in: mappedUserIds } },
    })

    console.log(`[Sync] Found ${mappedUsers.length} users for mappings`)
    console.log('[Sync] Users:', mappedUsers.map(u => ({
      id: u.id,
      email: u.email,
      salespersonId: u.salespersonId,
      isPlaceholder: u.isPlaceholder
    })))

    const mappedUserLookup = new Map(mappedUsers.map((mappedUser) => [mappedUser.id, mappedUser]))

    mappingsWithUsers.forEach((mapping) => {
      if (mapping.userId) {
        const mappedUser = mappedUserLookup.get(mapping.userId)
        if (mappedUser) {
          salespersonMap.set(mapping.acumaticaSalespersonId, mappedUser)
        }
      }
    })

    console.log(`[Sync] Built salesperson map with ${salespersonMap.size} entries`)
    console.log('[Sync] Salesperson map keys:', Array.from(salespersonMap.keys()))

    const clientCache = new Map<string, Client>()
    const projectCache = new Map<string, Project>()
    const projectPlanCache = new Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>()
    const clientPlanCache = new Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>()
    const orgPlanCache: { value?: (CommissionPlan & { rules: CommissionRule[] }) | null } = {}

    const skipped: Array<{ invoiceRef: string; reason: string; debugData?: unknown }> = []
    const errors: Array<{ invoiceRef: string; error: string }> = []

    const summary: SyncSummary = {
      invoicesFetched: invoices.length,
      invoicesProcessed: 0,
      invoicesSkipped: 0,
      salesCreated: 0,
      clientsCreated: 0,
      projectsCreated: 0,
      errorsCount: 0,
    }

    for (const invoice of invoices) {
      const invoiceRef = invoice.ReferenceNbr?.value || 'Unknown'
      try {
        // Log the full invoice commissions data for debugging
        console.log(`\n========== Processing Invoice ${invoiceRef} ==========`)
        console.log(`[${invoiceRef}] Full Commissions data:`, JSON.stringify(invoice.Commissions, null, 2))

        let transactionUser = await buildTransactionUser({ invoice, salespersonMap })

        // If no user found, check if we can create a mapping on the fly
        if (!transactionUser) {
          const salespersons = invoice.Commissions?.SalesPersons
          const salespersonId = salespersons?.[0]?.SalespersonID?.value

          console.log(`[${invoiceRef}] === SALESPERSON MATCHING FAILED ===`)
          console.log(`[${invoiceRef}] SalesPersons array:`, JSON.stringify(salespersons, null, 2))
          console.log(`[${invoiceRef}] Extracted SalespersonID: "${salespersonId}"`)
          console.log(`[${invoiceRef}] Available mappings in database:`)

          // Show what mappings exist for debugging
          const allMappings = await prisma.acumaticaSalespersonMapping.findMany({
            where: { integrationId: integration.id },
            select: {
              acumaticaSalespersonId: true,
              acumaticaSalespersonName: true,
              status: true,
              userId: true,
            },
          })
          console.log(`[${invoiceRef}] All mappings:`, allMappings.map(m => ({
            id: m.acumaticaSalespersonId,
            name: m.acumaticaSalespersonName,
            status: m.status,
            hasUser: !!m.userId
          })))

          if (salespersonId) {
            console.log(`[${invoiceRef}] Attempting to create on-the-fly mapping for: "${salespersonId}"`)

            // Check if a mapping exists but wasn't loaded (e.g., IGNORED status)
            const existingMapping = await prisma.acumaticaSalespersonMapping.findUnique({
              where: {
                integrationId_acumaticaSalespersonId: {
                  integrationId: integration.id,
                  acumaticaSalespersonId: salespersonId,
                },
              },
            })

            if (existingMapping) {
              console.log(`[${invoiceRef}] Found existing mapping:`, {
                id: existingMapping.acumaticaSalespersonId,
                name: existingMapping.acumaticaSalespersonName,
                status: existingMapping.status,
                userId: existingMapping.userId,
                matchType: existingMapping.matchType
              })
            }

            if (existingMapping && existingMapping.status === 'IGNORED') {
              console.log(`[${invoiceRef}] Salesperson ${salespersonId} is IGNORED, skipping invoice`)
              summary.invoicesSkipped += 1
              skipped.push({ invoiceRef, reason: 'Salesperson is ignored' })
              continue
            }

            if (!existingMapping) {
              // Create a new mapping and placeholder user
              console.log(`[${invoiceRef}] No existing mapping found, creating new placeholder for: "${salespersonId}"`)

              const placeholderUser = await prisma.user.create({
                data: {
                  email: `${salespersonId.toLowerCase()}@placeholder.local`,
                  firstName: salespersonId,
                  lastName: null,
                  role: 'SALESPERSON',
                  organizationId,
                  isPlaceholder: true,
                  clerkId: null,
                  salespersonId: salespersonId,
                  invitedAt: null,
                },
              })

              await prisma.acumaticaSalespersonMapping.create({
                data: {
                  integrationId: integration.id,
                  acumaticaSalespersonId: salespersonId,
                  acumaticaSalespersonName: salespersonId,
                  acumaticaEmail: null,
                  userId: placeholderUser.id,
                  status: 'PLACEHOLDER',
                  matchType: 'AUTO_PLACEHOLDER',
                },
              })

              // Add to the map so subsequent invoices can use it
              salespersonMap.set(salespersonId, placeholderUser)
              transactionUser = placeholderUser

              console.log(`[${invoiceRef}] ✓ Created placeholder user for ${salespersonId}`)
            } else {
              console.log(`[${invoiceRef}] Existing mapping found but userId is null - this shouldn't happen after placeholder creation!`)
            }
          } else {
            console.log(`[${invoiceRef}] No SalespersonID found in invoice data`)
          }
        } else {
          console.log(`[${invoiceRef}] ✓ Successfully matched to user: ${transactionUser.email}`)
        }

        if (!transactionUser) {
          console.log(`[${invoiceRef}] ✗ SKIPPING: No transaction user after all attempts`)
          summary.invoicesSkipped += 1

          // Capture debug data for the skip
          const salespersonOnInvoice = invoice.Commissions?.SalesPersons?.[0]
          const debugData = {
            invoiceSalesperson: salespersonOnInvoice ? {
              salespersonId: salespersonOnInvoice.SalespersonID?.value,
              commissionPercent: salespersonOnInvoice.CommissionPercent?.value,
              commissionAmount: salespersonOnInvoice.CommissionAmount?.value,
              commissionableAmount: salespersonOnInvoice.CommissionableAmount?.value,
            } : null,
            availableMappings: await prisma.acumaticaSalespersonMapping.findMany({
              where: { integrationId: integration.id },
              select: {
                acumaticaSalespersonId: true,
                acumaticaSalespersonName: true,
                status: true,
                userId: true,
              },
            }),
          }

          skipped.push({
            invoiceRef,
            reason: 'No mapped salesperson found',
            debugData
          })
          continue
        }

        const { client, created: clientCreated, externalId: customerExternalId } = await resolveClient({
          integrationId: integration.id,
          syncLogId: syncLog.id,
          organizationId,
          customerIdSource: integration.customerIdSource ?? 'ID',
          customerHandling: integration.customerHandling ?? 'CREATE',
          invoice,
          clientCache,
          acumaticaClient,
        })

        if (!client) {
          summary.invoicesSkipped += 1
          skipped.push({ invoiceRef, reason: 'Customer was skipped or not found' })
          continue
        }

        if (clientCreated) {
          summary.clientsCreated += 1
        }

        const { project, created: projectCreated } = await resolveProject({
          integrationId: integration.id,
          syncLogId: syncLog.id,
          organizationId,
          projectAutoCreate: integration.projectAutoCreate ?? false,
          noProjectHandling: integration.noProjectHandling ?? 'SKIP',
          invoice,
          client,
          projectCache,
          acumaticaClient,
          customerExternalId,
        })

        if (projectCreated) {
          summary.projectsCreated += 1
        }

        const transactionType = getTransactionType(invoice.Type?.value)
        const invoiceDate = new Date(invoice.Date?.value || new Date())
        const baseExternalData = {
          externalInvoiceRef: invoice.ReferenceNbr?.value,
          externalInvoiceDate: invoiceDate,
          externalBranch: invoice.FinancialDetails?.Branch?.value,
        }

        if (integration.importLevel === 'LINE_LEVEL') {
          const filteredLines = filterInvoiceLines(
            invoice.Details || [],
            integration.lineFilterMode ?? 'NONE',
            (integration.lineFilterValues as string[]) || []
          )

          if (filteredLines.length === 0) {
            summary.invoicesSkipped += 1
            skipped.push({ invoiceRef, reason: 'No invoice lines matched filters' })
            continue
          }

          let lineNumber = 0
          for (const line of filteredLines) {
            lineNumber += 1
            const amount = getLineAmount(line, integration.lineAmountField ?? 'ExtendedPrice')
            const normalizedAmount =
              transactionType === 'RETURN' ? -Math.abs(amount) : amount
            const externalId = `${invoiceRef}-${lineNumber}`

            const existing = await prisma.salesTransaction.findUnique({
              where: {
                organizationId_externalId_externalSystem: {
                  organizationId,
                  externalId,
                  externalSystem: ACUMATICA_SYSTEM,
                },
              },
            })

            if (existing) {
              summary.invoicesSkipped += 1
              skipped.push({ invoiceRef, reason: `Line ${lineNumber} already synced` })
              continue
            }

            const transaction = await prisma.salesTransaction.create({
              data: {
                amount: normalizedAmount,
                transactionType,
                projectId: project?.id || null,
                clientId: client.id,
                userId: transactionUser.id,
                organizationId,
                transactionDate: invoiceDate,
                description: line.Description?.value || invoiceRef,
                invoiceNumber: invoiceRef,
                sourceType: 'INTEGRATION',
                externalSystem: ACUMATICA_SYSTEM,
                externalId,
                integrationId: integration.id,
                syncLogId: syncLog.id,
                ...baseExternalData,
                externalLineNumber: lineNumber,
                externalItemId: integration.storeItemId ? line.InventoryID?.value : null,
                externalItemDescription: integration.storeItemDescription
                  ? line.Description?.value
                  : null,
                externalItemClass: integration.storeItemClass ? line.ItemClass?.value : null,
                externalGLAccount: integration.storeGLAccount ? line.Account?.value : null,
                externalQuantity: integration.storeQtyAndPrice ? line.Qty?.value : null,
                externalUnitPrice: integration.storeQtyAndPrice ? line.UnitPrice?.value : null,
                rawExternalData: integration.storeQtyAndPrice || integration.storeItemDescription
                  ? line
                    ? (JSON.parse(JSON.stringify(line)) as Prisma.InputJsonValue)
                    : undefined
                  : undefined,
              },
            })

            const commissionPlan = await resolveCommissionPlan({
              organizationId,
              projectId: project?.id,
              clientId: client.id,
              projectPlanCache,
              clientPlanCache,
              orgPlanCache,
            })

            await createCommissionCalculation({
              transactionId: transaction.id,
              transactionAmount: normalizedAmount,
              transactionDate: invoiceDate,
              projectId: project?.id,
              client,
              userId: transactionUser.id,
              organizationId,
              commissionPlan,
            })

            summary.salesCreated += 1
          }
        } else {
          const amount = getInvoiceAmount(invoice, integration.invoiceAmountField ?? 'Balance')
          const normalizedAmount =
            transactionType === 'RETURN' ? -Math.abs(amount) : amount
          const externalId = invoiceRef

          const existing = await prisma.salesTransaction.findUnique({
            where: {
              organizationId_externalId_externalSystem: {
                organizationId,
                externalId,
                externalSystem: ACUMATICA_SYSTEM,
              },
            },
          })

          if (existing) {
            summary.invoicesSkipped += 1
            skipped.push({ invoiceRef, reason: 'Invoice already synced' })
            continue
          }

          const transaction = await prisma.salesTransaction.create({
            data: {
              amount: normalizedAmount,
              transactionType,
              projectId: project?.id || null,
              clientId: client.id,
              userId: transactionUser.id,
              organizationId,
              transactionDate: invoiceDate,
              description: invoiceRef,
              invoiceNumber: invoiceRef,
              sourceType: 'INTEGRATION',
              externalSystem: ACUMATICA_SYSTEM,
              externalId,
              integrationId: integration.id,
              syncLogId: syncLog.id,
              ...baseExternalData,
              rawExternalData: JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonValue,
            },
          })

          const commissionPlan = await resolveCommissionPlan({
            organizationId,
            projectId: project?.id,
            clientId: client.id,
            projectPlanCache,
            clientPlanCache,
            orgPlanCache,
          })

          await createCommissionCalculation({
            transactionId: transaction.id,
            transactionAmount: normalizedAmount,
            transactionDate: invoiceDate,
            projectId: project?.id,
            client,
            userId: transactionUser.id,
            organizationId,
            commissionPlan,
          })

          summary.salesCreated += 1
        }

        summary.invoicesProcessed += 1
      } catch (error) {
        summary.errorsCount += 1
        errors.push({
          invoiceRef,
          error: error instanceof Error ? error.message : 'Sync error',
        })
      }
    }

    summary.invoicesSkipped = skipped.length

    const status =
      errors.length > 0
        ? summary.invoicesProcessed > 0
          ? 'PARTIAL_SUCCESS'
          : 'FAILED'
        : 'SUCCESS'

    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status,
        completedAt: new Date(),
        invoicesFetched: summary.invoicesFetched,
        invoicesProcessed: summary.invoicesProcessed,
        invoicesSkipped: summary.invoicesSkipped,
        salesCreated: summary.salesCreated,
        clientsCreated: summary.clientsCreated,
        projectsCreated: summary.projectsCreated,
        errorsCount: summary.errorsCount,
        skipDetails: JSON.parse(JSON.stringify(skipped)) as Prisma.InputJsonValue,
        errorDetails: JSON.parse(JSON.stringify(errors)) as Prisma.InputJsonValue,
        createdRecords: {
          salesCreated: summary.salesCreated,
          clientsCreated: summary.clientsCreated,
          projectsCreated: summary.projectsCreated,
        },
      },
    })

    await prisma.acumaticaIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        status: 'ACTIVE',
      },
    })

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      userEmail: user.email,
      action: 'integration_sync',
      entityType: 'integration',
      entityId: integration.id,
      description: `Acumatica sync completed: ${summary.salesCreated} sales created, ${summary.clientsCreated} clients created, ${summary.projectsCreated} projects created`,
      metadata: {
        invoicesFetched: summary.invoicesFetched,
        invoicesProcessed: summary.invoicesProcessed,
        invoicesSkipped: summary.invoicesSkipped,
        errorsCount: summary.errorsCount,
        salesCreated: summary.salesCreated,
        clientsCreated: summary.clientsCreated,
        projectsCreated: summary.projectsCreated,
      },
      organizationId,
    })

    revalidatePath('/dashboard/integrations')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/integrations/acumatica/sync-logs')

    return { success: true, summary }
  } catch (error) {
    if (syncLogId) {
      await prisma.integrationSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      })
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Acumatica',
    }
  } finally {
    if (acumaticaClient) {
      await acumaticaClient.logout()
    }
  }
}

export async function getAcumaticaSyncLogs() {
  try {
    const user = await getCurrentUser()
    const organizationId = user.organizationId

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId },
    })

    if (!integration) {
      return { success: false, error: 'Acumatica integration not found' }
    }

    const logs = await prisma.integrationSyncLog.findMany({
      where: { integrationId: integration.id },
      orderBy: { startedAt: 'desc' },
      take: 25,
    })

    const userIds = logs
      .map((log) => log.triggeredById)
      .filter((id): id is string => Boolean(id))

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    const userMap = new Map(
      users.map((u) => [u.id, u])
    )

    const formatted: SyncLogDetails[] = logs.map((log) => {
      const triggeredBy = log.triggeredById ? userMap.get(log.triggeredById) : null
      return {
        id: log.id,
        syncType: log.syncType,
        status: log.status,
        startedAt: log.startedAt.toISOString(),
        completedAt: log.completedAt ? log.completedAt.toISOString() : null,
        undoneAt: log.undoneAt ? log.undoneAt.toISOString() : null,
        triggeredBy: triggeredBy
          ? {
              id: triggeredBy.id,
              name: `${triggeredBy.firstName ?? ''} ${triggeredBy.lastName ?? ''}`.trim() || null,
              email: triggeredBy.email,
            }
          : null,
        invoicesFetched: log.invoicesFetched,
        invoicesProcessed: log.invoicesProcessed,
        invoicesSkipped: log.invoicesSkipped,
        salesCreated: log.salesCreated,
        clientsCreated: log.clientsCreated,
        projectsCreated: log.projectsCreated,
        errorsCount: log.errorsCount,
        skipDetails: log.skipDetails as Array<{ invoiceRef: string; reason: string; debugData?: unknown }> | null,
        errorDetails: log.errorDetails as Array<{ invoiceRef: string; error: string }> | null,
      }
    })

    return { success: true, logs: formatted }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load sync logs',
    }
  }
}

export async function undoAcumaticaSync(syncLogId: string) {
  try {
    const user = await getCurrentUser()
    const organizationId = user.organizationId

    const syncLog = await prisma.integrationSyncLog.findUnique({
      where: { id: syncLogId },
    })

    if (!syncLog) {
      return { success: false, error: 'Sync log not found' }
    }

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: syncLog.integrationId },
    })

    if (!integration || integration.organizationId !== organizationId) {
      return { success: false, error: 'Sync log does not belong to your organization' }
    }

    // Get all transactions from this sync
    const transactions = await prisma.salesTransaction.findMany({
      where: {
        organizationId,
        syncLogId: syncLog.id,
        sourceType: 'INTEGRATION',
      },
      select: { id: true },
    })

    const transactionIds = transactions.map((transaction) => transaction.id)

    // Delete commission calculations first (foreign key dependency)
    const deletedCommissions = await prisma.commissionCalculation.deleteMany({
      where: { salesTransactionId: { in: transactionIds } },
    })

    // Delete all sales transactions from this sync
    const deletedSales = await prisma.salesTransaction.deleteMany({
      where: { id: { in: transactionIds } },
    })

    // Delete projects created by this sync (only if they have no remaining transactions)
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        createdBySyncLogId: syncLog.id,
        sourceType: 'INTEGRATION',
      },
      include: { salesTransactions: true },
    })

    const deletableProjectIds = projects
      .filter((project) => project.salesTransactions.length === 0)
      .map((project) => project.id)

    const deletedProjects = await prisma.project.deleteMany({
      where: { id: { in: deletableProjectIds } },
    })

    // Delete clients created by this sync (only if they have no remaining transactions or projects)
    const clients = await prisma.client.findMany({
      where: {
        organizationId,
        createdBySyncLogId: syncLog.id,
        sourceType: 'INTEGRATION',
      },
      include: { projects: true, salesTransactions: true },
    })

    const deletableClientIds = clients
      .filter((client) => client.projects.length === 0 && client.salesTransactions.length === 0)
      .map((client) => client.id)

    const deletedClients = await prisma.client.deleteMany({
      where: { id: { in: deletableClientIds } },
    })

    // Mark the sync log as undone
    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: { undoneAt: new Date() },
    })

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      userEmail: user.email,
      action: 'integration_sync_reverted',
      entityType: 'integration',
      entityId: integration.id,
      description: `Reverted Acumatica sync ${syncLog.id}: ${deletedSales.count} sales and ${deletedCommissions.count} commissions removed`,
      metadata: {
        deletedSales: deletedSales.count,
        deletedCommissions: deletedCommissions.count,
        deletedProjects: deletedProjects.count,
        deletedClients: deletedClients.count,
      },
      organizationId,
    })

    revalidatePath('/dashboard/integrations')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/commissions')
    revalidatePath('/dashboard/integrations/acumatica/sync-logs')

    return {
      success: true,
      data: {
        deletedSales: deletedSales.count,
        deletedCommissions: deletedCommissions.count,
        deletedProjects: deletedProjects.count,
        deletedClients: deletedClients.count,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to undo sync',
    }
  }
}

/**
 * Smart Sync Router - Automatically chooses v2 or v1 sync based on integration configuration
 *
 * This is the main entry point for syncing Acumatica invoices. It detects whether the
 * integration has been configured with v2 (discovery-driven) or v1 (hardcoded) and
 * routes to the appropriate sync function.
 */
export async function syncAcumaticaInvoices() {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true },
    })

    if (!user || !user.organization) {
      throw new Error('User organization not found')
    }

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId: user.organizationId },
    })

    if (!integration) {
      return { success: false, error: 'Acumatica integration not found' }
    }

    // Check if v2 configuration exists
    const fieldMappings = integration.fieldMappings as FieldMappingConfig | null
    const filterConfig = integration.filterConfig as FilterConfig | null
    const hasV2Config = fieldMappings && filterConfig

    console.log(`[Sync Router] Using ${hasV2Config ? 'v2' : 'v1'} sync engine`)

    if (hasV2Config) {
      // Use v2 discovery-driven sync
      return await syncAcumaticaInvoicesV2()
    } else {
      // Fall back to v1 hardcoded sync
      return await syncAcumaticaInvoicesV1()
    }
  } catch (error) {
    console.error('[Sync Router] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Acumatica',
    }
  }
}
