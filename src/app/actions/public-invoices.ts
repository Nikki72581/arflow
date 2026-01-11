"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PublicInvoiceData } from "@/lib/types";

/**
 * Get public invoice by share token (NO AUTH REQUIRED)
 */
export async function getPublicInvoice(shareToken: string): Promise<{
  success: boolean;
  data?: PublicInvoiceData;
  error?: string;
}> {
  try {
    const document = await prisma.arDocument.findFirst({
      where: {
        publicShareToken: shareToken,
        publicShareEnabled: true,
        documentType: "INVOICE", // Only invoices can be shared publicly
      },
      include: {
        lineItems: {
          orderBy: { lineNumber: 'asc' },
        },
        customer: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            billingAddress1: true,
            billingAddress2: true,
            billingCity: true,
            billingState: true,
            billingZip: true,
          },
        },
        organization: {
          select: {
            name: true,
            logoUrl: true,
            address1: true,
            address2: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
            website: true,
          },
        },
      },
    });

    if (!document) {
      return { success: false, error: "Invoice not found or sharing is disabled" };
    }

    // Check if Stripe is enabled for payment
    const stripeIntegration = await prisma.stripeIntegration.findUnique({
      where: { organizationId: document.organizationId },
    });

    const canPay = !!(stripeIntegration?.enabled && document.balanceDue > 0);

    return {
      success: true,
      data: {
        id: document.id,
        documentNumber: document.documentNumber,
        documentDate: document.documentDate,
        dueDate: document.dueDate,
        subtotal: document.subtotal,
        taxAmount: document.taxAmount,
        totalAmount: document.totalAmount,
        amountPaid: document.amountPaid,
        balanceDue: document.balanceDue,
        status: document.status,
        customerNotes: document.customerNotes,
        lineItems: document.lineItems,
        customer: document.customer,
        organization: document.organization,
        canPay,
      } as PublicInvoiceData,
    };
  } catch (error: any) {
    console.error("Error fetching public invoice:", error);
    return { success: false, error: "Failed to load invoice" };
  }
}

/**
 * Generate public share link for invoice (AUTHENTICATED - ADMIN ONLY)
 */
export async function generatePublicShareLink(documentId: string): Promise<{
  success: boolean;
  shareToken?: string;
  shareUrl?: string;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Only admins can generate share links" };
    }

    const document = await prisma.arDocument.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId,
        documentType: "INVOICE", // Only invoices can be shared
      },
    });

    if (!document) {
      return { success: false, error: "Invoice not found" };
    }

    // Generate or retrieve share token
    let shareToken = document.publicShareToken;
    if (!shareToken || !document.publicShareEnabled) {
      // Import cuid dynamically
      const { createId } = await import('@paralleldrive/cuid2');
      shareToken = createId();

      await prisma.arDocument.update({
        where: { id: documentId },
        data: {
          publicShareToken: shareToken,
          publicShareEnabled: true,
          publicShareCreatedAt: new Date(),
        },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/invoice/${shareToken}`;

    revalidatePath(`/dashboard/documents/${documentId}`);

    return { success: true, shareToken, shareUrl };
  } catch (error: any) {
    console.error("Error generating share link:", error);
    return { success: false, error: "Failed to generate share link" };
  }
}

/**
 * Disable public sharing for invoice (AUTHENTICATED - ADMIN ONLY)
 */
export async function disablePublicSharing(documentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Only admins can manage sharing" };
    }

    await prisma.arDocument.update({
      where: {
        id: documentId,
        organizationId: user.organizationId,
      },
      data: {
        publicShareEnabled: false,
      },
    });

    revalidatePath(`/dashboard/documents/${documentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error disabling sharing:", error);
    return { success: false, error: "Failed to disable sharing" };
  }
}

/**
 * Create Stripe checkout for public invoice (NO AUTH REQUIRED)
 */
export async function createPublicInvoiceCheckout(shareToken: string): Promise<{
  success: boolean;
  sessionUrl?: string;
  error?: string;
}> {
  try {
    // Get invoice by share token
    const document = await prisma.arDocument.findFirst({
      where: {
        publicShareToken: shareToken,
        publicShareEnabled: true,
        documentType: "INVOICE",
      },
      include: {
        customer: true,
      },
    });

    if (!document) {
      return { success: false, error: "Invoice not found" };
    }

    if (document.balanceDue <= 0) {
      return { success: false, error: "This invoice is already paid" };
    }

    // Get Stripe integration
    const stripeIntegration = await prisma.stripeIntegration.findUnique({
      where: { organizationId: document.organizationId },
    });

    if (!stripeIntegration || !stripeIntegration.enabled) {
      return { success: false, error: "Payment gateway not configured" };
    }

    // Decrypt credentials and create checkout session
    const { getDecryptedStripeCredentials } = await import("./stripe");
    const credentials = await getDecryptedStripeCredentials(document.organizationId);

    if (!credentials) {
      return { success: false, error: "Payment gateway credentials not found" };
    }

    // Create checkout session using existing Stripe integration
    const { createCheckoutSession } = await import("@/lib/payment-gateway/stripe/checkout");

    const result = await createCheckoutSession(credentials, {
      organizationId: document.organizationId,
      customerId: document.customerId,
      documentIds: [document.id],
      amount: document.balanceDue,
      mode: "generate_link", // Use hosted mode for public payments
    });

    if (!result.success || !result.sessionUrl) {
      return { success: false, error: result.error || "Failed to create payment session" };
    }

    return { success: true, sessionUrl: result.sessionUrl };
  } catch (error: any) {
    console.error("Error creating public checkout:", error);
    return { success: false, error: "Failed to create payment session" };
  }
}
