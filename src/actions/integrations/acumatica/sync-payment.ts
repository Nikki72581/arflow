"use server";

import { prisma } from "@/lib/db";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";
import { createPayment, mapDocumentType } from "@/lib/acumatica/payments";
import type { CreatePaymentRequest } from "@/lib/acumatica/types";

interface SyncPaymentResult {
  success: boolean;
  acumaticaPaymentRef?: string;
  error?: string;
}

/**
 * Sync a CustomerPayment record to Acumatica
 * Creates an AR Payment in Acumatica and updates the payment record with sync status
 *
 * @param paymentId - The ARFlow CustomerPayment ID to sync
 * @returns Result with success status and Acumatica payment reference or error
 */
export async function syncPaymentToAcumatica(
  paymentId: string,
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
    if (!integration.defaultCashAccount || !integration.defaultPaymentMethod) {
      throw new Error(
        "Acumatica payment configuration is incomplete. Please set default cash account and payment method in integration settings.",
      );
    }

    // 5. Get customer's Acumatica ID
    if (!payment.customer.externalId) {
      throw new Error(
        `Customer ${payment.customer.companyName} does not have an Acumatica Customer ID. Please sync customers first.`,
      );
    }

    // 6. Build payment applications array
    const documentsToApply = payment.paymentApplications.map((app) => {
      // Get Acumatica reference number from document
      const acumaticaRefNbr = app.arDocument.externalId;

      if (!acumaticaRefNbr) {
        throw new Error(
          `Document ${app.arDocument.documentNumber} does not have an Acumatica reference number`,
        );
      }

      return {
        docType: mapDocumentType(app.arDocument.documentType),
        referenceNbr: acumaticaRefNbr,
        amountPaid: app.amountApplied,
      };
    });

    // 7. Create authenticated Acumatica client
    const client = await createAuthenticatedClient(integration);

    // 8. Build payment request
    const paymentRequest: CreatePaymentRequest = {
      type: "Payment",
      customerId: payment.customer.externalId,
      paymentMethod: integration.defaultPaymentMethod,
      cashAccount: integration.defaultCashAccount,
      paymentAmount: payment.amount,
      paymentRef: payment.paymentNumber,
      applicationDate: payment.paymentDate,
      description: `Payment from ARFlow - ${payment.paymentNumber}`,
      documentsToApply:
        documentsToApply.length > 0 ? documentsToApply : undefined,
    };

    console.log("[Sync Payment] Creating payment in Acumatica:", {
      customerId: paymentRequest.customerId,
      amount: paymentRequest.paymentAmount,
      documentsCount: documentsToApply.length,
    });

    // 9. Create payment in Acumatica
    const acumaticaPayment = await createPayment(client, paymentRequest);

    console.log("[Sync Payment] Payment created in Acumatica:", {
      referenceNbr: acumaticaPayment.ReferenceNbr.value,
      status: acumaticaPayment.Status.value,
    });

    // 10. Update payment record with sync status
    await prisma.customerPayment.update({
      where: { id: paymentId },
      data: {
        acumaticaPaymentRef: acumaticaPayment.ReferenceNbr.value,
        acumaticaSyncStatus: "synced",
        acumaticaSyncError: null,
        acumaticaSyncedAt: new Date(),
      },
    });

    // 11. Log successful sync
    await prisma.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType: "PAYMENT_SYNC",
        status: "SUCCESS",
        startedAt: new Date(),
        completedAt: new Date(),
        invoicesFetched: 0,
        invoicesProcessed: 0,
        invoicesSkipped: 0,
        documentsCreated: 0,
        customersCreated: 0,
        errorsCount: 0,
        results: {
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
              syncType: "PAYMENT_SYNC",
              status: "FAILED",
              startedAt: new Date(),
              completedAt: new Date(),
              invoicesFetched: 0,
              invoicesProcessed: 0,
              invoicesSkipped: 0,
              documentsCreated: 0,
              customersCreated: 0,
              errorsCount: 1,
              errors: [
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
 * @returns Result with success status
 */
export async function retrySyncPayment(
  paymentId: string,
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

  return syncPaymentToAcumatica(paymentId);
}
