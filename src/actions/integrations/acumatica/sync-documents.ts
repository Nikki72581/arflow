"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  UserRole,
  DocumentType,
  DocumentStatus,
  RecordSourceType,
  SyncStatus,
  SyncType,
} from "@prisma/client";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";
import { AcumaticaQueryBuilder } from "@/lib/acumatica/query-builder";
import { FieldExtractor } from "@/lib/acumatica/field-extractor";
import type {
  FieldMappingConfig,
  FilterConfig,
} from "@/lib/acumatica/config-types";
import { revalidatePath } from "next/cache";

export interface SyncRecordDetail {
  documentRef: string;
  customerId: string;
  customerName?: string;
  amount: number;
  balance: number;
  date: string;
  action: "created" | "updated" | "skipped" | "error";
  reason?: string;
  arDocumentId?: string;
}

export interface SyncDocumentsResult {
  success: boolean;
  syncLogId?: string;
  summary?: {
    totalFetched: number;
    documentsCreated: number;
    documentsUpdated: number;
    documentsSkipped: number;
    customersCreated: number;
    errors: number;
  };
  error?: string;
}

export interface SyncProgress {
  status: SyncStatus;
  totalFetched: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface SyncLogDetails {
  id: string;
  syncType: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt: Date | null;
  invoicesFetched: number;
  invoicesProcessed: number;
  invoicesSkipped: number;
  documentsCreated: number;
  customersCreated: number;
  errorsCount: number;
  createdRecords: SyncRecordDetail[];
  updatedRecords: SyncRecordDetail[];
  skippedRecords: SyncRecordDetail[];
  errorRecords: SyncRecordDetail[];
}

/**
 * Manually sync documents (invoices/orders) from Acumatica to ARFlow
 */
export async function syncDocumentsFromAcumatica(
  integrationId: string,
  options?: {
    limit?: number;
    syncType?: SyncType;
  },
): Promise<SyncDocumentsResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return { success: false, error: "Only administrators can sync documents" };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null =
    null;
  let syncLog: any = null;

  try {
    // Get the integration configuration
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
      include: {
        customerMappings: true,
      },
    });

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    if (integration.organizationId !== user.organizationId) {
      return { success: false, error: "Integration not found" };
    }

    if (integration.status !== "ACTIVE") {
      return {
        success: false,
        error: "Integration is not active. Please complete setup first.",
      };
    }

    // Validate configuration
    const fieldMappings =
      integration.fieldMappings as FieldMappingConfig | null;
    const filterConfig = integration.filterConfig as FilterConfig | null;

    if (!fieldMappings) {
      return {
        success: false,
        error: "Field mappings not configured. Please complete setup.",
      };
    }

    if (!filterConfig) {
      return {
        success: false,
        error: "Filter configuration not set. Please complete setup.",
      };
    }

    // Create sync log
    syncLog = await prisma.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType: options?.syncType || SyncType.MANUAL,
        status: SyncStatus.STARTED,
        triggeredById: user.id,
        invoicesFetched: 0,
        invoicesProcessed: 0,
        invoicesSkipped: 0,
        documentsCreated: 0,
        customersCreated: 0,
        errorsCount: 0,
      },
    });

    console.log("[Sync] Starting document sync, log ID:", syncLog.id);

    // Create authenticated client
    client = await createAuthenticatedClient(integration);
    console.log("[Sync] Client authenticated successfully");

    // Build query for fetching documents
    const query = AcumaticaQueryBuilder.buildPreviewQuery(
      integration.apiVersion,
      integration.dataSourceType,
      integration.dataSourceEntity,
      fieldMappings,
      filterConfig,
      options?.limit || 1000, // Default to 1000 records max
    );

    console.log("[Sync] Query:", query);

    // Fetch documents from Acumatica
    const useBasicAuth =
      integration.dataSourceType === "GENERIC_INQUIRY" ||
      integration.dataSourceType === "DAC_ODATA";

    const response = useBasicAuth
      ? await client.makeBasicAuthRequest("GET", query)
      : await client.makeRequest("GET", query);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Sync] API error response:", errorText);
      throw new Error(
        `Failed to fetch documents: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const records = data.value || (Array.isArray(data) ? data : [data]);

    console.log(`[Sync] Fetched ${records.length} records from Acumatica`);

    // Update sync log with fetched count
    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.IN_PROGRESS,
        invoicesFetched: records.length,
      },
    });

    // Build customer mapping lookup
    const customerMappingLookup = new Map<string, string>();
    for (const mapping of integration.customerMappings) {
      if (mapping.customerId && mapping.status === "MATCHED") {
        customerMappingLookup.set(
          mapping.acumaticaCustomerId,
          mapping.customerId,
        );
      }
    }

    // Process records
    let documentsCreated = 0;
    let documentsUpdated = 0;
    let documentsSkipped = 0;
    let customersCreated = 0;
    let errorsCount = 0;
    const createdRecords: SyncRecordDetail[] = [];
    const updatedRecords: SyncRecordDetail[] = [];
    const skippedRecords: SyncRecordDetail[] = [];
    const errorRecords: SyncRecordDetail[] = [];

    for (const record of records) {
      try {
        // Extract data using field mappings
        const extractedData = FieldExtractor.extractInvoiceData(
          record,
          fieldMappings,
        );

        if (!extractedData.uniqueId) {
          documentsSkipped++;
          skippedRecords.push({
            documentRef: "unknown",
            customerId: extractedData.customerId || "unknown",
            customerName: extractedData.customerName,
            amount: extractedData.amount || 0,
            balance: extractedData.balance || 0,
            date: extractedData.date?.toISOString() || new Date().toISOString(),
            action: "skipped",
            reason: "Missing unique ID",
          });
          continue;
        }

        // Check if customer exists or needs to be created
        let customerId = customerMappingLookup.get(extractedData.customerId);

        if (!customerId) {
          // Check if customer already exists in ARFlow by external ID
          const existingCustomer = await prisma.customer.findFirst({
            where: {
              organizationId: integration.organizationId,
              externalId: extractedData.customerId,
              externalSystem: "ACUMATICA",
            },
          });

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else if (integration.unmappedCustomerAction === "SKIP") {
            // Skip documents with unmapped customers
            documentsSkipped++;
            skippedRecords.push({
              documentRef: extractedData.uniqueId,
              customerId: extractedData.customerId,
              customerName: extractedData.customerName,
              amount: extractedData.amount,
              balance: extractedData.balance,
              date: extractedData.date.toISOString(),
              action: "skipped",
              reason: `Unmapped customer: ${extractedData.customerId}`,
            });
            continue;
          } else if (integration.unmappedCustomerAction === "AUTO_CREATE") {
            // Automatically create new customer
            const newCustomer = await prisma.customer.create({
              data: {
                organizationId: integration.organizationId,
                companyName:
                  extractedData.customerName || extractedData.customerId,
                customerNumber: extractedData.customerId,
                externalId: extractedData.customerId,
                externalSystem: "ACUMATICA",
                sourceType: RecordSourceType.INTEGRATION,
                createdByIntegrationId: integration.id,
                createdBySyncLogId: syncLog.id,
              },
            });
            customerId = newCustomer.id;
            customersCreated++;

            // Create customer mapping
            await prisma.acumaticaCustomerMapping.upsert({
              where: {
                integrationId_acumaticaCustomerId: {
                  integrationId: integration.id,
                  acumaticaCustomerId: extractedData.customerId,
                },
              },
              create: {
                integrationId: integration.id,
                acumaticaCustomerId: extractedData.customerId,
                acumaticaCustomerName:
                  extractedData.customerName || extractedData.customerId,
                customerId: customerId,
                status: "MATCHED",
                matchType: "AUTO_PLACEHOLDER",
              },
              update: {
                customerId: customerId,
                status: "MATCHED",
              },
            });

            // Update lookup for future records
            customerMappingLookup.set(extractedData.customerId, customerId);
          } else if (
            integration.unmappedCustomerAction === "DEFAULT_USER" &&
            integration.defaultCustomerUserId
          ) {
            // Assign to default customer
            // First check if the default user has a linked customer
            const defaultUser = await prisma.user.findUnique({
              where: { id: integration.defaultCustomerUserId },
              include: { customer: true },
            });

            if (defaultUser?.customerId) {
              customerId = defaultUser.customerId;
            } else {
              // Skip if default user doesn't have a customer linked
              documentsSkipped++;
              skippedRecords.push({
                documentRef: extractedData.uniqueId,
                customerId: extractedData.customerId,
                customerName: extractedData.customerName,
                amount: extractedData.amount,
                balance: extractedData.balance,
                date: extractedData.date.toISOString(),
                action: "skipped",
                reason: `Default customer not configured properly`,
              });
              continue;
            }
          } else {
            // Fallback: skip if no valid action
            documentsSkipped++;
            skippedRecords.push({
              documentRef: extractedData.uniqueId,
              customerId: extractedData.customerId,
              customerName: extractedData.customerName,
              amount: extractedData.amount,
              balance: extractedData.balance,
              date: extractedData.date.toISOString(),
              action: "skipped",
              reason: `Unmapped customer: ${extractedData.customerId} (no handling configured)`,
            });
            continue;
          }
        }

        // Determine document type based on entity type
        const documentType = mapAcumaticaEntityToDocumentType(
          integration.dataSourceEntity,
        );

        // Calculate due date (30 days from document date if not provided)
        const dueDate = new Date(extractedData.date);
        dueDate.setDate(dueDate.getDate() + 30);

        // Check if document already exists
        const existingDocument = await prisma.arDocument.findFirst({
          where: {
            organizationId: integration.organizationId,
            externalId: extractedData.uniqueId,
            externalSystem: "ACUMATICA",
          },
        });

        if (existingDocument) {
          // Update existing document
          await prisma.arDocument.update({
            where: { id: existingDocument.id },
            data: {
              totalAmount: extractedData.amount,
              balanceDue: extractedData.balance,
              amountPaid: extractedData.amount - extractedData.balance,
              status:
                extractedData.balance <= 0
                  ? DocumentStatus.PAID
                  : extractedData.balance < extractedData.amount
                    ? DocumentStatus.PARTIAL
                    : DocumentStatus.OPEN,
              description: extractedData.description,
              rawExternalData: record,
              updatedAt: new Date(),
            },
          });
          documentsUpdated++;
          updatedRecords.push({
            documentRef: extractedData.uniqueId,
            customerId: extractedData.customerId,
            customerName: extractedData.customerName,
            amount: extractedData.amount,
            balance: extractedData.balance,
            date: extractedData.date.toISOString(),
            action: "updated",
            arDocumentId: existingDocument.id,
          });
        } else {
          // Create new document
          const newDocument = await prisma.arDocument.create({
            data: {
              organizationId: integration.organizationId,
              customerId: customerId,
              documentType: documentType,
              documentNumber: extractedData.uniqueId,
              documentDate: extractedData.date,
              dueDate: dueDate,
              subtotal: extractedData.amount,
              taxAmount: 0,
              totalAmount: extractedData.amount,
              amountPaid: extractedData.amount - extractedData.balance,
              balanceDue: extractedData.balance,
              status:
                extractedData.balance <= 0
                  ? DocumentStatus.PAID
                  : extractedData.balance < extractedData.amount
                    ? DocumentStatus.PARTIAL
                    : DocumentStatus.OPEN,
              description: extractedData.description,
              sourceType: RecordSourceType.INTEGRATION,
              externalSystem: "ACUMATICA",
              externalId: extractedData.uniqueId,
              integrationId: integration.id,
              syncLogId: syncLog.id,
              externalBranch: extractedData.branch,
              rawExternalData: record,
            },
          });
          documentsCreated++;
          createdRecords.push({
            documentRef: extractedData.uniqueId,
            customerId: extractedData.customerId,
            customerName: extractedData.customerName,
            amount: extractedData.amount,
            balance: extractedData.balance,
            date: extractedData.date.toISOString(),
            action: "created",
            arDocumentId: newDocument.id,
          });
        }
      } catch (recordError) {
        console.error("[Sync] Error processing record:", recordError);
        errorsCount++;

        // Try to extract some info from the raw record for error logging
        const refNbr =
          record?.ReferenceNbr?.value || record?.OrderNbr?.value || "unknown";
        const custId = record?.CustomerID?.value || "unknown";
        const amount = record?.Amount?.value || record?.OrderTotal?.value || 0;
        const balance =
          record?.Balance?.value || record?.UnpaidBalance?.value || 0;

        errorRecords.push({
          documentRef: refNbr,
          customerId: custId,
          amount: amount,
          balance: balance,
          date: new Date().toISOString(),
          action: "error",
          reason:
            recordError instanceof Error
              ? recordError.message
              : "Unknown error",
        });
      }
    }

    // Update sync log with final results including detailed records
    await prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status:
          errorsCount > 0 && documentsCreated === 0
            ? SyncStatus.FAILED
            : errorsCount > 0
              ? SyncStatus.PARTIAL_SUCCESS
              : SyncStatus.SUCCESS,
        completedAt: new Date(),
        invoicesProcessed: documentsCreated + documentsUpdated,
        invoicesSkipped: documentsSkipped,
        documentsCreated: documentsCreated,
        customersCreated: customersCreated,
        errorsCount: errorsCount,
        // Store detailed record information as JSON
        createdRecords:
          createdRecords.length > 0
            ? JSON.parse(JSON.stringify(createdRecords))
            : undefined,
        skipDetails:
          skippedRecords.length > 0
            ? JSON.parse(JSON.stringify(skippedRecords))
            : undefined,
        errorDetails:
          errorRecords.length > 0
            ? JSON.parse(JSON.stringify(errorRecords))
            : undefined,
      },
    });

    // Update integration last sync time
    await prisma.acumaticaIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
      },
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/integrations");
    revalidatePath("/dashboard/integrations/acumatica");

    console.log("[Sync] Sync completed successfully");

    return {
      success: true,
      syncLogId: syncLog.id,
      summary: {
        totalFetched: records.length,
        documentsCreated,
        documentsUpdated,
        documentsSkipped,
        customersCreated,
        errors: errorsCount,
      },
    };
  } catch (error) {
    console.error("[Sync] Error syncing documents:", error);

    // Update sync log with error
    if (syncLog) {
      await prisma.integrationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          errorsCount: 1,
          errorDetails: [
            {
              documentRef: "sync",
              customerId: "N/A",
              amount: 0,
              balance: 0,
              date: new Date().toISOString(),
              action: "error",
              reason: error instanceof Error ? error.message : "Unknown error",
            },
          ],
        },
      });
    }

    return {
      success: false,
      syncLogId: syncLog?.id,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  } finally {
    // Always logout to clean up the Acumatica session
    if (client) {
      try {
        await client.logout();
        console.log("[Sync] Logged out of Acumatica session");
      } catch (logoutError) {
        console.error("[Sync] Failed to logout:", logoutError);
      }
    }
  }
}

/**
 * Get sync history for an integration
 */
export async function getSyncHistory(
  integrationId: string,
  limit: number = 10,
) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can view sync history");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  const logs = await prisma.integrationSyncLog.findMany({
    where: { integrationId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return logs;
}

/**
 * Get detailed information about a specific sync operation
 */
export async function getSyncDetails(
  syncLogId: string,
): Promise<SyncLogDetails | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  const log = await prisma.integrationSyncLog.findUnique({
    where: { id: syncLogId },
    include: {
      integration: true,
    },
  });

  if (!log || log.integration.organizationId !== user.organizationId) {
    return null;
  }

  return {
    id: log.id,
    syncType: log.syncType,
    status: log.status,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    invoicesFetched: log.invoicesFetched,
    invoicesProcessed: log.invoicesProcessed,
    invoicesSkipped: log.invoicesSkipped,
    documentsCreated: log.documentsCreated,
    customersCreated: log.customersCreated,
    errorsCount: log.errorsCount,
    createdRecords: (log.createdRecords as unknown as SyncRecordDetail[]) || [],
    updatedRecords: [], // We store updates in createdRecords for now, could separate later
    skippedRecords: (log.skipDetails as unknown as SyncRecordDetail[]) || [],
    errorRecords: (log.errorDetails as unknown as SyncRecordDetail[]) || [],
  };
}

/**
 * Get the status of a specific sync operation
 */
export async function getSyncStatus(
  syncLogId: string,
): Promise<SyncProgress | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  const log = await prisma.integrationSyncLog.findUnique({
    where: { id: syncLogId },
    include: {
      integration: true,
    },
  });

  if (!log || log.integration.organizationId !== user.organizationId) {
    return null;
  }

  return {
    status: log.status,
    totalFetched: log.invoicesFetched,
    processed: log.invoicesProcessed,
    created: log.documentsCreated,
    updated: log.invoicesProcessed - log.documentsCreated,
    skipped: log.invoicesSkipped,
    errors: log.errorsCount,
  };
}

/**
 * Map Acumatica entity type to ARFlow document type
 */
function mapAcumaticaEntityToDocumentType(entityType: string): DocumentType {
  const normalizedType = entityType.toLowerCase();

  if (
    normalizedType.includes("invoice") ||
    normalizedType.includes("salesinvoice")
  ) {
    return DocumentType.INVOICE;
  }
  if (
    normalizedType.includes("order") ||
    normalizedType.includes("salesorder")
  ) {
    return DocumentType.ORDER;
  }
  if (normalizedType.includes("credit")) {
    return DocumentType.CREDIT_MEMO;
  }
  if (normalizedType.includes("debit")) {
    return DocumentType.DEBIT_MEMO;
  }
  if (normalizedType.includes("quote")) {
    return DocumentType.QUOTE;
  }

  // Default to invoice
  return DocumentType.INVOICE;
}
