"use server";

import { prisma } from "@/lib/db";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";
import { createPayment, mapDocumentType } from "@/lib/acumatica/payments";
import type { CreatePaymentRequest } from "@/lib/acumatica/types";
import type { SyncType } from "@prisma/client";

interface SyncPaymentResult {
  success: boolean;
  acumaticaPaymentRef?: string;
  error?: string;
}

interface SyncEligibilityResult {
  eligible: boolean;
  reason?: string;
  details?: {
    hasIntegration: boolean;
    integrationActive: boolean;
    paymentConfigured: boolean;
    customerHasExternalId: boolean;
    documentsHaveExternalIds: boolean;
    documentsWithoutExternalIds?: string[];
  };
}

/**
 * Check if a payment is eligible to be synced to Acumatica
 * This is useful to show sync status in the UI before attempting sync
 */
export async function checkPaymentSyncEligibility(
  paymentId: string,
): Promise<SyncEligibilityResult> {
  try {
    const payment = await prisma.customerPayment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        paymentApplications: {
          include: {
            arDocument: {
              select: {
                id: true,
                documentNumber: true,
                externalId: true,
                externalSystem: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return { eligible: false, reason: "Payment not found" };
    }

    // Check if already synced
    if (
      payment.acumaticaSyncStatus === "synced" &&
      payment.acumaticaPaymentRef
    ) {
      return {
        eligible: false,
        reason: `Payment already synced to Acumatica (${payment.acumaticaPaymentRef})`,
      };
    }

    // Check integration status
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId: payment.organizationId },
    });

    const hasIntegration = !!integration;
    const integrationActive = integration?.status === "ACTIVE";
    const paymentConfigured = !!integration?.defaultPaymentMethod;
    const customerHasExternalId = !!payment.customer.externalId;

    // Check documents for external IDs
    const documentsWithoutExternalIds = payment.paymentApplications
      .filter((app) => !app.arDocument.externalId)
      .map((app) => app.arDocument.documentNumber);
    const documentsHaveExternalIds = documentsWithoutExternalIds.length === 0;

    const details = {
      hasIntegration,
      integrationActive,
      paymentConfigured,
      customerHasExternalId,
      documentsHaveExternalIds,
      documentsWithoutExternalIds:
        documentsWithoutExternalIds.length > 0
          ? documentsWithoutExternalIds
          : undefined,
    };

    // Build reason message
    if (!hasIntegration) {
      return {
        eligible: false,
        reason: "Acumatica integration not configured",
        details,
      };
    }
    if (!integrationActive) {
      return {
        eligible: false,
        reason: "Acumatica integration is not active",
        details,
      };
    }
    if (!paymentConfigured) {
      return {
        eligible: false,
        reason: "Payment method not configured in Acumatica settings",
        details,
      };
    }
    if (!customerHasExternalId) {
      return {
        eligible: false,
        reason: `Customer "${payment.customer.companyName}" is not linked to an Acumatica customer`,
        details,
      };
    }
    if (!documentsHaveExternalIds && payment.paymentApplications.length > 0) {
      return {
        eligible: false,
        reason: `${documentsWithoutExternalIds.length} document(s) are not synced from Acumatica: ${documentsWithoutExternalIds.join(", ")}`,
        details,
      };
    }

    return { eligible: true, details };
  } catch (error) {
    console.error("[Sync Payment] Error checking eligibility:", error);
    return {
      eligible: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync a CustomerPayment record to Acumatica
 * Creates an AR Payment in Acumatica and updates the payment record with sync status
 *
 * @param paymentId - The ARFlow CustomerPayment ID to sync
 * @param syncType - The type of sync (MANUAL or SCHEDULED)
 * @returns Result with success status and Acumatica payment reference or error
 */
export async function syncPaymentToAcumatica(
  paymentId: string,
  syncType: SyncType = "MANUAL",
): Promise<SyncPaymentResult> {
  try {
    console.log("[Sync Payment] Starting sync for payment:", paymentId);

    // 1. Fetch the payment with related data
    const payment = await prisma.customerPayment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        paymentApplications: {
          include: {
            arDocument: true,
          },
        },
        organization: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // 2. Check if already synced
    if (
      payment.acumaticaSyncStatus === "synced" &&
      payment.acumaticaPaymentRef
    ) {
      console.log(
        "[Sync Payment] Payment already synced:",
        payment.acumaticaPaymentRef,
      );
      return {
        success: true,
        acumaticaPaymentRef: payment.acumaticaPaymentRef,
      };
    }

    // 3. Get Acumatica integration config
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId: payment.organizationId },
    });

    if (!integration || integration.status !== "ACTIVE") {
      throw new Error(
        "Acumatica integration is not active for this organization",
      );
    }

    // 4. Check if payment configuration is set
    if (!integration.defaultPaymentMethod) {
      throw new Error(
        "Acumatica payment configuration is incomplete. Please set a default payment method in integration settings.",
      );
    }

    // 5. Get customer's Acumatica ID
    if (!payment.customer.externalId) {
      throw new Error(
        `Customer ${payment.customer.companyName} does not have an Acumatica Customer ID. Please sync customers first.`,
      );
    }

    // 6. Validate and build payment applications array
    // First, check which documents have Acumatica references
    const documentsWithoutRefs = payment.paymentApplications.filter(
      (app) => !app.arDocument.externalId,
    );

    if (documentsWithoutRefs.length > 0) {
      const missingDocs = documentsWithoutRefs
        .map((app) => app.arDocument.documentNumber)
        .join(", ");
      throw new Error(
        `Cannot sync payment: ${documentsWithoutRefs.length} document(s) are not linked to Acumatica: ${missingDocs}. Please sync documents from Acumatica first.`,
      );
    }

    // 6a. Create authenticated Acumatica client early to validate documents
    const client = await createAuthenticatedClient(integration);

    try {
      // 6b. Validate each document exists in Acumatica and is eligible for payment application
      const documentsToValidate = payment.paymentApplications.map((app) => ({
        externalId: app.arDocument.externalId as string,
        docType: mapDocumentType(app.arDocument.documentType),
        documentNumber: app.arDocument.documentNumber,
      }));

      const invalidDocuments: string[] = [];

      for (const doc of documentsToValidate) {
        try {
          console.log(
            `[Sync Payment] Validating document ${doc.externalId} exists in Acumatica...`,
          );

          // Try to fetch the invoice from Acumatica to ensure it exists
          // For Invoice type, we check the Invoice endpoint
          const endpoint = `Invoice/${doc.externalId}`;
          const validateResponse = await client.makeRequest(
            "GET",
            endpoint + "?$select=ReferenceNbr,Type,Status,Balance,BranchID",
          );

          if (!validateResponse.ok) {
            console.error(
              `[Sync Payment] Document ${doc.externalId} validation failed:`,
              validateResponse.status,
            );
            invalidDocuments.push(
              `${doc.documentNumber} (${doc.externalId}) - not found in Acumatica`,
            );
            continue;
          }

          const invoiceData = await validateResponse.json();
          const refNbr = invoiceData.ReferenceNbr?.value;
          const type = invoiceData.Type?.value;
          const status = invoiceData.Status?.value;
          const balance = invoiceData.Balance?.value || 0;
          const docBranch = invoiceData.BranchID?.value;

          console.log(
            `[Sync Payment] Document ${doc.externalId} validated - RefNbr: ${refNbr}, Type: ${type}, Status: ${status}, Balance: ${balance}, Branch: ${docBranch || "(none)"}`,
          );

          // Check if the document is in a state that allows payment application
          if (status === "Balanced" || status === "Closed") {
            invalidDocuments.push(
              `${doc.documentNumber} (${doc.externalId}) - status is ${status}, cannot apply payment`,
            );
          } else if (balance <= 0) {
            invalidDocuments.push(
              `${doc.documentNumber} (${doc.externalId}) - has zero balance`,
            );
          }
        } catch (docError) {
          console.error(
            `[Sync Payment] Error validating document ${doc.externalId}:`,
            docError,
          );
          invalidDocuments.push(
            `${doc.documentNumber} (${doc.externalId}) - validation error: ${docError instanceof Error ? docError.message : "Unknown error"}`,
          );
        }
      }

      if (invalidDocuments.length > 0) {
        throw new Error(
          `Cannot sync payment: ${invalidDocuments.length} document(s) are not eligible for payment in Acumatica:\n${invalidDocuments.join("\n")}`,
        );
      }

      const documentsToApply = payment.paymentApplications.map((app) => {
        return {
          docType: mapDocumentType(app.arDocument.documentType),
          referenceNbr: app.arDocument.externalId as string,
          amountPaid: app.amountApplied,
        };
      });

      console.log(
        "[Sync Payment] Documents to apply:",
        JSON.stringify(documentsToApply, null, 2),
      );

      // 7. Build payment request
      // Note: cashAccount is not specified - Acumatica will use the default cash account
      // associated with the payment method

      // Determine the branch from the documents being applied
      // In multi-branch orgs, the payment must be in the same branch as the documents
      let branchId: string | undefined = undefined;

      if (payment.paymentApplications.length > 0) {
        // Get unique branches from all documents
        const branches = new Set(
          payment.paymentApplications
            .map((app) => app.arDocument.externalBranch)
            .filter((branch): branch is string => !!branch),
        );

        if (branches.size === 1) {
          // All documents are in the same branch - use it
          branchId = Array.from(branches)[0];
          console.log(`[Sync Payment] Using branch ${branchId} from documents`);
        } else if (branches.size > 1) {
          // Documents are in multiple branches - this is a problem
          console.warn(
            `[Sync Payment] Documents span multiple branches: ${Array.from(branches).join(", ")}`,
          );
          // Use the first branch as a fallback, but this may cause issues
          branchId = Array.from(branches)[0];
          console.log(
            `[Sync Payment] Using first branch ${branchId} as fallback`,
          );
        } else {
          console.log(
            "[Sync Payment] No branch information found on documents",
          );
        }
      }

      const paymentRequest: CreatePaymentRequest = {
        type: "Payment",
        customerId: payment.customer.externalId,
        paymentMethod: integration.defaultPaymentMethod,
        branchId: branchId, // Include branch if available
        paymentAmount: payment.amount,
        paymentRef: payment.paymentNumber,
        applicationDate: payment.paymentDate,
        description: `Payment from ARFlow - ${payment.paymentNumber}`,
        documentsToApply:
          documentsToApply.length > 0 ? documentsToApply : undefined,
      };

      console.log("[Sync Payment] Creating payment in Acumatica:", {
        customerId: paymentRequest.customerId,
        branchId: paymentRequest.branchId || "(not specified)",
        amount: paymentRequest.paymentAmount,
        documentsCount: documentsToApply.length,
      });

      // 8. Create payment in Acumatica
      const acumaticaPayment = await createPayment(client, paymentRequest);

      console.log("[Sync Payment] Payment created in Acumatica:", {
        referenceNbr: acumaticaPayment.ReferenceNbr.value,
        status: acumaticaPayment.Status.value,
      });

      // 9. Update payment record with sync status
      await prisma.customerPayment.update({
        where: { id: paymentId },
        data: {
          acumaticaPaymentRef: acumaticaPayment.ReferenceNbr.value,
          acumaticaSyncStatus: "synced",
          acumaticaSyncError: null,
          acumaticaSyncedAt: new Date(),
        },
      });

      // 10. Log successful sync
      await prisma.integrationSyncLog.create({
        data: {
          integrationId: integration.id,
          syncType: syncType,
          status: "SUCCESS",
          startedAt: new Date(),
          completedAt: new Date(),
          invoicesFetched: 0,
          invoicesProcessed: 0,
          invoicesSkipped: 0,
          documentsCreated: 0,
          customersCreated: 0,
          errorsCount: 0,
          createdRecords: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            acumaticaPaymentRef: acumaticaPayment.ReferenceNbr.value,
            amount: payment.amount,
            applicationsCount: documentsToApply.length,
          },
        },
      });

      console.log("[Sync Payment] Sync completed successfully");

      return {
        success: true,
        acumaticaPaymentRef: acumaticaPayment.ReferenceNbr.value,
      };
    } finally {
      // CRITICAL: Always logout to clean up the Acumatica session
      try {
        await client.logout();
        console.log("[Sync Payment] Logged out of Acumatica session");
      } catch (logoutError) {
        console.error("[Sync Payment] Failed to logout:", logoutError);
      }
    }
  } catch (error) {
    console.error("[Sync Payment] Error syncing payment:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Update payment record with error status
    try {
      await prisma.customerPayment.update({
        where: { id: paymentId },
        data: {
          acumaticaSyncStatus: "failed",
          acumaticaSyncError: errorMessage,
        },
      });

      // Log failed sync
      const payment = await prisma.customerPayment.findUnique({
        where: { id: paymentId },
        include: { organization: true },
      });

      if (payment) {
        const integration = await prisma.acumaticaIntegration.findUnique({
          where: { organizationId: payment.organizationId },
        });

        if (integration) {
          await prisma.integrationSyncLog.create({
            data: {
              integrationId: integration.id,
              syncType: syncType,
              status: "FAILED",
              startedAt: new Date(),
              completedAt: new Date(),
              invoicesFetched: 0,
              invoicesProcessed: 0,
              invoicesSkipped: 0,
              documentsCreated: 0,
              customersCreated: 0,
              errorsCount: 1,
              errorDetails: [
                {
                  paymentId: payment.id,
                  paymentNumber: payment.paymentNumber,
                  error: errorMessage,
                },
              ],
            },
          });
        }
      }
    } catch (updateError) {
      console.error(
        "[Sync Payment] Error updating payment status:",
        updateError,
      );
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Retry syncing a failed payment
 * This is useful when the initial sync failed due to temporary issues
 *
 * @param paymentId - The ARFlow CustomerPayment ID to retry
 * @param syncType - The type of sync (MANUAL or SCHEDULED)
 * @returns Result with success status
 */
export async function retrySyncPayment(
  paymentId: string,
  syncType: SyncType = "MANUAL",
): Promise<SyncPaymentResult> {
  console.log("[Sync Payment] Retrying sync for payment:", paymentId);

  // Reset sync status before retrying
  await prisma.customerPayment.update({
    where: { id: paymentId },
    data: {
      acumaticaSyncStatus: "pending",
      acumaticaSyncError: null,
    },
  });

  return syncPaymentToAcumatica(paymentId, syncType);
}
