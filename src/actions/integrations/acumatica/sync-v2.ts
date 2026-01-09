/**
 * Acumatica Integration v2 Sync Engine
 *
 * Uses dynamic field mappings and filter configurations to import invoices.
 * This replaces the hardcoded v1 sync logic with a flexible, discovery-driven approach.
 */

'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { createAuthenticatedClient } from '@/lib/acumatica/auth';
import { AcumaticaQueryBuilder } from '@/lib/acumatica/query-builder';
import { FieldExtractor, type ExtractedInvoiceData } from '@/lib/acumatica/field-extractor';
import type { FieldMappingConfig, FilterConfig } from '@/lib/acumatica/config-types';
import type { User, Client, Project, CommissionPlan, CommissionRule } from '@prisma/client';
import {
  calculateCommissionWithPrecedence,
  type CalculationContext,
  type ScopedCommissionRule,
} from '@/lib/commission-calculator';
import { calculateNetSalesAmount } from '@/lib/net-sales-calculator';

const ACUMATICA_SYSTEM = 'ACUMATICA';

interface SyncSummary {
  invoicesFetched: number;
  invoicesProcessed: number;
  invoicesSkipped: number;
  salesCreated: number;
  clientsCreated: number;
  projectsCreated: number;
  errorsCount: number;
}

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { organization: true },
  });

  if (!user || !user.organization) {
    throw new Error('User organization not found');
  }

  if (user.role !== 'ADMIN') {
    throw new Error('Only admins can sync integrations');
  }

  return user;
}

async function resolveClient({
  integrationId,
  syncLogId,
  organizationId,
  customerId,
  customerName,
  clientCache,
}: {
  integrationId: string;
  syncLogId: string;
  organizationId: string;
  customerId: string;
  customerName?: string;
  clientCache: Map<string, Client>;
}) {
  // Check cache
  if (clientCache.has(customerId)) {
    return { client: clientCache.get(customerId)!, created: false };
  }

  // Check if client exists
  const existing = await prisma.client.findUnique({
    where: {
      organizationId_externalId_externalSystem: {
        organizationId,
        externalId: customerId,
        externalSystem: ACUMATICA_SYSTEM,
      },
    },
  });

  if (existing) {
    // Update clientId if it's missing (for clients created before this fix)
    if (!existing.clientId) {
      const updated = await prisma.client.update({
        where: { id: existing.id },
        data: { clientId: customerId },
      });
      clientCache.set(customerId, updated);
      return { client: updated, created: false };
    }
    clientCache.set(customerId, existing);
    return { client: existing, created: false };
  }

  // Create new client
  const newClient = await prisma.client.create({
    data: {
      name: customerName || customerId,
      clientId: customerId, // Acumatica customer number for user reference
      organizationId,
      externalId: customerId, // For integration tracking
      externalSystem: ACUMATICA_SYSTEM,
      sourceType: 'INTEGRATION',
      createdByIntegrationId: integrationId,
      createdBySyncLogId: syncLogId,
    },
  });

  clientCache.set(customerId, newClient);
  return { client: newClient, created: true };
}

async function resolveProject({
  integrationId,
  syncLogId,
  organizationId,
  projectId,
  client,
  projectCache,
  hasProjectMapping,
}: {
  integrationId: string;
  syncLogId: string;
  organizationId: string;
  projectId?: string;
  client: Client;
  projectCache: Map<string, Project>;
  hasProjectMapping: boolean;
}) {
  // If no project field is mapped in field mappings, do not create or use any projects
  if (!hasProjectMapping) {
    return { project: null, created: false };
  }

  if (!projectId) {
    // Project field is mapped but this invoice doesn't have a project value
    // Return null - no project should be created or associated
    return { project: null, created: false };
  }

  // Use provided project ID
  if (projectCache.has(projectId)) {
    return { project: projectCache.get(projectId)!, created: false };
  }

  const existing = await prisma.project.findUnique({
    where: {
      organizationId_externalId_externalSystem: {
        organizationId,
        externalId: projectId,
        externalSystem: ACUMATICA_SYSTEM,
      },
    },
  });

  if (existing) {
    projectCache.set(projectId, existing);
    return { project: existing, created: false };
  }

  const newProject = await prisma.project.create({
    data: {
      name: projectId,
      clientId: client.id,
      organizationId,
      externalId: projectId,
      externalSystem: ACUMATICA_SYSTEM,
      sourceType: 'INTEGRATION',
      createdByIntegrationId: integrationId,
      createdBySyncLogId: syncLogId,
    },
  });

  projectCache.set(projectId, newProject);
  return { project: newProject, created: true };
}

async function resolveCommissionPlan({
  organizationId,
  projectId,
  clientId,
  projectPlanCache,
  clientPlanCache,
  orgPlanCache,
}: {
  organizationId: string;
  projectId?: string | null;
  clientId?: string | null;
  projectPlanCache: Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>;
  clientPlanCache: Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>;
  orgPlanCache: { value?: (CommissionPlan & { rules: CommissionRule[] }) | null };
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
      });

      projectPlanCache.set(projectId, project?.commissionPlans?.[0] ?? null);
    }

    const plan = projectPlanCache.get(projectId) ?? null;
    if (plan) return plan;
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
      });
      clientPlanCache.set(clientId, clientPlan ?? null);
    }

    const plan = clientPlanCache.get(clientId) ?? null;
    if (plan) return plan;
  }

  if (orgPlanCache.value === undefined) {
    const orgPlan = await prisma.commissionPlan.findFirst({
      where: { organizationId, isActive: true, projectId: null },
      include: { rules: true },
      orderBy: { createdAt: 'desc' },
    });
    orgPlanCache.value = orgPlan ?? null;
  }

  return orgPlanCache.value ?? null;
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
  transactionId: string;
  transactionAmount: number;
  transactionDate: Date;
  projectId?: string | null;
  client?: Client | null;
  userId: string;
  organizationId: string;
  commissionPlan: (CommissionPlan & { rules: CommissionRule[] }) | null;
}) {
  if (!commissionPlan || commissionPlan.rules.length === 0) {
    return null;
  }

  const netAmount = await calculateNetSalesAmount(transactionId);

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
  };

  const result = calculateCommissionWithPrecedence(
    context,
    commissionPlan.rules as ScopedCommissionRule[]
  );

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
  };

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
  });
}

export async function syncAcumaticaInvoicesV2() {
  let syncLogId: string | null = null;

  try {
    const user = await getCurrentUser();
    const organizationId = user.organizationId;

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId },
    });

    if (!integration) {
      return { success: false, error: 'Acumatica integration not found' };
    }

    // Validate v2 configuration
    const fieldMappings = integration.fieldMappings as FieldMappingConfig | null;
    const filterConfig = integration.filterConfig as FilterConfig | null;

    if (!fieldMappings || !filterConfig) {
      return {
        success: false,
        error: 'Integration not configured. Please complete the setup wizard.',
      };
    }

    // Create sync log
    const syncLog = await prisma.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType: 'MANUAL',
        status: 'STARTED',
        triggeredById: user.id,
      },
    });

    syncLogId = syncLog.id;

    // Create authenticated client
    const client = await createAuthenticatedClient(integration);

    try {
      // Build dynamic query
      const query = AcumaticaQueryBuilder.buildQuery(
        integration.apiVersion,
        integration.dataSourceType,
        integration.dataSourceEntity,
        fieldMappings,
        filterConfig
      );

      console.log('[Sync V2] Query:', query);

      // Fetch invoices
      // Generic Inquiry and DAC OData endpoints require Basic Auth instead of session cookies
      const useBasicAuth = integration.dataSourceType === 'GENERIC_INQUIRY' ||
                          integration.dataSourceType === 'DAC_ODATA';

      const response = useBasicAuth
        ? await client.makeBasicAuthRequest('GET', query)
        : await client.makeRequest('GET', query);

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const invoices = data.value || (Array.isArray(data) ? data : [data]);

      console.log(`[Sync V2] Fetched ${invoices.length} invoices`);

      await prisma.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: { status: 'IN_PROGRESS' },
      });

      // Build salesperson map
      const salespersonMap = new Map<string, User>();

      console.log('[Sync V2] Querying salesperson mappings for integration:', integration.id);

      // First, log ALL mappings for debugging
      const allMappings = await prisma.acumaticaSalespersonMapping.findMany({
        where: { integrationId: integration.id },
        select: {
          acumaticaSalespersonId: true,
          userId: true,
          status: true,
          matchType: true,
        },
      });
      console.log('[Sync V2] Total mappings in database:', allMappings.length);
      allMappings.forEach((m, i) => {
        console.log(`[Sync V2] All Mapping ${i + 1}: acumaticaSalespersonId="${m.acumaticaSalespersonId}", userId="${m.userId}", status="${m.status}", matchType="${m.matchType}"`);
      });

      // Now get only mappings with users (what we actually use)
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
        },
      });

      console.log('[Sync V2] Found', mappingsWithUsers.length, 'salesperson mappings with users (non-IGNORED + has userId)');
      if (mappingsWithUsers.length === 0 && allMappings.length > 0) {
        console.warn('[Sync V2] WARNING: There are', allMappings.length, 'total mappings but NONE have userId set!');
        console.warn('[Sync V2] This likely means saveSalespersonMappings() was never called to create placeholder users.');
      }

      const mappedUserIds = mappingsWithUsers
        .map((mapping) => mapping.userId)
        .filter((id): id is string => Boolean(id));

      const mappedUsers = await prisma.user.findMany({
        where: { id: { in: mappedUserIds } },
      });

      const mappedUserLookup = new Map(mappedUsers.map((u) => [u.id, u]));

      mappingsWithUsers.forEach((mapping) => {
        if (mapping.userId) {
          const mappedUser = mappedUserLookup.get(mapping.userId);
          if (mappedUser) {
            salespersonMap.set(mapping.acumaticaSalespersonId, mappedUser);
          }
        }
      });

      console.log(`[Sync V2] Built salesperson map with ${salespersonMap.size} entries`);
      console.log('[Sync V2] Salesperson map keys:', Array.from(salespersonMap.keys()));
      console.log('[Sync V2] Sample salesperson map entry:',
        salespersonMap.size > 0
          ? { id: Array.from(salespersonMap.keys())[0], user: Array.from(salespersonMap.values())[0].email }
          : 'No entries'
      );

      // Caches
      const clientCache = new Map<string, Client>();
      const projectCache = new Map<string, Project>();
      const projectPlanCache = new Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>();
      const clientPlanCache = new Map<string, (CommissionPlan & { rules: CommissionRule[] }) | null>();
      const orgPlanCache: { value?: (CommissionPlan & { rules: CommissionRule[] }) | null } = {};

      const skipped: Array<{ invoiceRef: string; reason: string; debugData?: unknown }> = [];
      const errors: Array<{ invoiceRef: string; error: string }> = [];

      const summary: SyncSummary = {
        invoicesFetched: invoices.length,
        invoicesProcessed: 0,
        invoicesSkipped: 0,
        salesCreated: 0,
        clientsCreated: 0,
        projectsCreated: 0,
        errorsCount: 0,
      };

      // Process each invoice
      for (const rawInvoice of invoices) {
        try {
          // Extract data using field mappings
          const invoiceData = FieldExtractor.extractInvoiceData(rawInvoice, fieldMappings);
          const invoiceRef = invoiceData.uniqueId;

          console.log(`[Sync V2] Processing invoice ${invoiceRef}`);

          // Check if already imported
          const existing = await prisma.salesTransaction.findUnique({
            where: {
              organizationId_externalId_externalSystem: {
                organizationId,
                externalId: invoiceRef,
                externalSystem: ACUMATICA_SYSTEM,
              },
            },
          });

          if (existing) {
            summary.invoicesSkipped += 1;
            skipped.push({ invoiceRef, reason: 'Already imported' });
            continue;
          }

          // Resolve salesperson
          if (!invoiceData.salespersonId) {
            summary.invoicesSkipped += 1;
            skipped.push({ invoiceRef, reason: 'No salesperson assigned' });
            continue;
          }

          console.log(`[Sync V2] Invoice ${invoiceRef} - Looking for salesperson: "${invoiceData.salespersonId}"`);
          console.log(`[Sync V2] Invoice ${invoiceRef} - Salesperson ID type: ${typeof invoiceData.salespersonId}`);
          console.log(`[Sync V2] Invoice ${invoiceRef} - Available salesperson IDs in map:`, Array.from(salespersonMap.keys()));

          let transactionUser = salespersonMap.get(invoiceData.salespersonId);

          if (!transactionUser) {
            console.log(`[Sync V2] Invoice ${invoiceRef} - MISMATCH: Salesperson "${invoiceData.salespersonId}" not found in map`);
            console.log(`[Sync V2] Invoice ${invoiceRef} - Checking for case-insensitive or trimmed matches...`);

            // Try to find a case-insensitive or trimmed match and USE it
            const trimmedId = invoiceData.salespersonId.trim();
            const lowerCaseId = trimmedId.toLowerCase();
            for (const [mapKey, mapUser] of salespersonMap.entries()) {
              if (mapKey.trim().toLowerCase() === lowerCaseId) {
                console.log(`[Sync V2] Invoice ${invoiceRef} - Found case-insensitive/trimmed match: "${mapKey}" matches "${invoiceData.salespersonId}" - using this mapping`);
                transactionUser = mapUser;
                break;
              }
            }

            // If still no match after case-insensitive search, handle unmapped salesperson
            if (!transactionUser) {
              console.log(`[Sync V2] Invoice ${invoiceRef} - Raw invoice salesperson data:`, JSON.stringify(rawInvoice.Commissions || rawInvoice.SalesPersons || 'No commission data', null, 2));

              if (integration.unmappedSalespersonAction === 'SKIP') {
                summary.invoicesSkipped += 1;
                skipped.push({
                  invoiceRef,
                  reason: `Unmapped salesperson: ${invoiceData.salespersonId}`,
                });
                continue;
              }

              // Handle DEFAULT_USER action if configured
              if (integration.unmappedSalespersonAction === 'DEFAULT_USER' && integration.defaultSalespersonUserId) {
                const defaultUser = await prisma.user.findUnique({
                  where: { id: integration.defaultSalespersonUserId },
                });

                if (!defaultUser) {
                  summary.invoicesSkipped += 1;
                  skipped.push({
                    invoiceRef,
                    reason: 'Default user not found',
                  });
                  continue;
                }

                // Use default user
                transactionUser = defaultUser;
              } else {
                summary.invoicesSkipped += 1;
                skipped.push({
                  invoiceRef,
                  reason: `Unmapped salesperson: ${invoiceData.salespersonId}`,
                });
                continue;
              }
            }
          }

          // Resolve client
          const { client, created: clientCreated } = await resolveClient({
            integrationId: integration.id,
            syncLogId: syncLog.id,
            organizationId,
            customerId: invoiceData.customerId,
            customerName: invoiceData.customerName,
            clientCache,
          });

          if (clientCreated) {
            summary.clientsCreated += 1;
          }

          // Resolve project
          const { project, created: projectCreated } = await resolveProject({
            integrationId: integration.id,
            syncLogId: syncLog.id,
            organizationId,
            projectId: invoiceData.projectId,
            client,
            projectCache,
            hasProjectMapping: !!fieldMappings.project?.sourceField,
          });

          if (projectCreated) {
            summary.projectsCreated += 1;
          }

          // Create sales transaction
          const transaction = await prisma.salesTransaction.create({
            data: {
              amount: invoiceData.amount,
              transactionType: 'SALE', // Can be enhanced based on document type
              projectId: project?.id || null,
              clientId: project ? null : client.id,
              userId: transactionUser.id,
              organizationId,
              transactionDate: invoiceData.date,
              description: invoiceData.description || invoiceRef,
              invoiceNumber: invoiceRef,
              sourceType: 'INTEGRATION',
              externalSystem: ACUMATICA_SYSTEM,
              externalId: invoiceRef,
              integrationId: integration.id,
              syncLogId: syncLog.id,
              externalInvoiceRef: invoiceRef,
              externalInvoiceDate: invoiceData.date,
              externalBranch: invoiceData.branch,
              customFieldValues: invoiceData.customFields || undefined,
              rawExternalData: rawInvoice,
            },
          });

          // Calculate commission
          const commissionPlan = await resolveCommissionPlan({
            organizationId,
            projectId: project?.id,
            clientId: client.id,
            projectPlanCache,
            clientPlanCache,
            orgPlanCache,
          });

          await createCommissionCalculation({
            transactionId: transaction.id,
            transactionAmount: invoiceData.amount,
            transactionDate: invoiceData.date,
            projectId: project?.id,
            client,
            userId: transactionUser.id,
            organizationId,
            commissionPlan,
          });

          summary.salesCreated += 1;
          summary.invoicesProcessed += 1;
        } catch (error) {
          console.error('[Sync V2] Error processing invoice:', error);
          summary.errorsCount += 1;
          errors.push({
            invoiceRef: 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update sync log and integration's lastSyncAt
      const completedAt = new Date();
      await prisma.$transaction([
        prisma.integrationSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'SUCCESS',
            completedAt,
            invoicesFetched: summary.invoicesFetched,
            invoicesProcessed: summary.invoicesProcessed,
            invoicesSkipped: summary.invoicesSkipped,
            salesCreated: summary.salesCreated,
            clientsCreated: summary.clientsCreated,
            projectsCreated: summary.projectsCreated,
            errorsCount: summary.errorsCount,
            skipDetails: skipped.length > 0 ? (skipped as any) : undefined,
            errorDetails: errors.length > 0 ? (errors as any) : undefined,
          },
        }),
        prisma.acumaticaIntegration.update({
          where: { id: integration.id },
          data: { lastSyncAt: completedAt },
        }),
      ]);

      return {
        success: true,
        summary,
        syncLogId: syncLog.id,
      };
    } finally {
      await client.logout();
    }
  } catch (error) {
    console.error('[Sync V2] Error:', error);

    if (syncLogId) {
      await prisma.integrationSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorDetails: [
            {
              invoiceRef: 'N/A',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        },
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
