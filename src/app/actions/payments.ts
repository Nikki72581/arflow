"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentGatewayProvider } from "@prisma/client";
import { getDecryptedCredentials } from "./authorize-net";
import { getDecryptedStripeCredentials } from "./stripe";
import { processStripePayment } from "@/lib/payment-gateway/stripe/client";

interface PaymentData {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  referenceNumber?: string;
  notes?: string;
  documentIds: string[]; // Documents to apply payment to
}

interface CreditCardPaymentData extends PaymentData {
  cardNumber: string;
  expirationDate: string; // MMYY format
  cvv: string;
  billingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

export async function createManualPayment(data: PaymentData) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can create payments" };
  }

  try {
    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        organizationId: user.organizationId,
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Validate documents exist and get their balances
    const documents = await prisma.arDocument.findMany({
      where: {
        id: { in: data.documentIds },
        organizationId: user.organizationId,
        customerId: data.customerId,
      },
    });

    if (documents.length !== data.documentIds.length) {
      return { success: false, error: "One or more documents not found" };
    }

    // Calculate total balance due
    const totalBalanceDue = documents.reduce((sum, doc) => sum + doc.balanceDue, 0);

    if (data.amount > totalBalanceDue) {
      return {
        success: false,
        error: `Payment amount ($${data.amount}) exceeds total balance due ($${totalBalanceDue})`,
      };
    }

    // Generate payment number
    const paymentCount = await prisma.customerPayment.count({
      where: { organizationId: user.organizationId },
    });
    const paymentNumber = `PMT-${String(paymentCount + 1).padStart(6, "0")}`;

    // Create the payment
    const payment = await prisma.customerPayment.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        paymentNumber,
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        status: "APPLIED",
        sourceType: "MANUAL",
      },
    });

    // Apply payment to documents
    let remainingAmount = data.amount;
    const applications = [];

    for (const document of documents) {
      if (remainingAmount <= 0) break;

      const amountToApply = Math.min(remainingAmount, document.balanceDue);

      const application = await prisma.paymentApplication.create({
        data: {
          organizationId: user.organizationId,
          paymentId: payment.id,
          arDocumentId: document.id,
          amountApplied: amountToApply,
        },
      });

      applications.push(application);

      // Update document balance and status
      const newBalance = document.balanceDue - amountToApply;
      const newAmountPaid = document.amountPaid + amountToApply;

      let newStatus = document.status;
      if (newBalance === 0) {
        newStatus = "PAID";
      } else if (newAmountPaid > 0 && newBalance > 0) {
        newStatus = "PARTIAL";
      }

      await prisma.arDocument.update({
        where: { id: document.id },
        data: {
          balanceDue: newBalance,
          amountPaid: newAmountPaid,
          status: newStatus,
          paidDate: newBalance === 0 ? new Date() : null,
        },
      });

      remainingAmount -= amountToApply;
    }

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/clients/${data.customerId}`);
    data.documentIds.forEach((id) => revalidatePath(`/dashboard/documents/${id}`));

    return {
      success: true,
      data: {
        payment,
        applications,
      },
    };
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return { success: false, error: error.message || "Failed to create payment" };
  }
}

export async function processCreditCardPayment(data: CreditCardPaymentData) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  try {
    // Get active payment gateway provider
    const gatewaySettings = await prisma.paymentGatewaySettings.findUnique({
      where: { organizationId: user.organizationId },
    });

    const activeProvider = gatewaySettings?.activeProvider;

    if (!activeProvider) {
      return {
        success: false,
        error: "No payment gateway configured. Please contact support.",
      };
    }

    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        organizationId: user.organizationId,
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Validate documents
    const documents = await prisma.arDocument.findMany({
      where: {
        id: { in: data.documentIds },
        organizationId: user.organizationId,
        customerId: data.customerId,
      },
    });

    if (documents.length !== data.documentIds.length) {
      return { success: false, error: "One or more documents not found" };
    }

    const totalBalanceDue = documents.reduce((sum, doc) => sum + doc.balanceDue, 0);

    if (data.amount > totalBalanceDue) {
      return {
        success: false,
        error: `Payment amount ($${data.amount}) exceeds total balance due ($${totalBalanceDue})`,
      };
    }

    // Process payment through the active gateway provider
    let gatewayResponse: {
      success: boolean;
      transactionId?: string;
      cardType?: string;
      rawResponse?: any;
      error?: string;
    };

    if (activeProvider === "AUTHORIZE_NET") {
      const credentials = await getDecryptedCredentials(user.organizationId);
      if (!credentials) {
        return {
          success: false,
          error: "Authorize.net not configured. Please contact support.",
        };
      }

      gatewayResponse = await processAuthorizeNetTransaction({
        credentials,
        amount: data.amount,
        cardNumber: data.cardNumber,
        expirationDate: data.expirationDate,
        cvv: data.cvv,
        billingAddress: data.billingAddress,
        customerEmail: customer.email || undefined,
      });
    } else if (activeProvider === "STRIPE") {
      const credentials = await getDecryptedStripeCredentials(user.organizationId);
      if (!credentials) {
        return {
          success: false,
          error: "Stripe not configured. Please contact support.",
        };
      }

      // Parse expiration date from MMYY format
      const expirationMonth = data.expirationDate.substring(0, 2);
      const expirationYear = "20" + data.expirationDate.substring(2, 4);

      gatewayResponse = await processStripePayment(credentials, {
        amount: data.amount,
        creditCard: {
          cardNumber: data.cardNumber,
          expirationMonth,
          expirationYear,
          cvv: data.cvv,
        },
        billingAddress: data.billingAddress,
        customerEmail: customer.email || undefined,
        description: `Payment from ${customer.companyName}`,
      });
    } else {
      return {
        success: false,
        error: "Invalid payment gateway provider",
      };
    }

    if (!gatewayResponse.success) {
      return {
        success: false,
        error: gatewayResponse.error || "Payment processing failed",
      };
    }

    // Generate payment number
    const paymentCount = await prisma.customerPayment.count({
      where: { organizationId: user.organizationId },
    });
    const paymentNumber = `PMT-${String(paymentCount + 1).padStart(6, "0")}`;

    // Create the payment record
    const payment = await prisma.customerPayment.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        paymentNumber,
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMethod: "CREDIT_CARD",
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        status: "APPLIED",
        sourceType: "MANUAL",
        gatewayTransactionId: gatewayResponse.transactionId,
        gatewayResponse: gatewayResponse.rawResponse,
        last4Digits: data.cardNumber.slice(-4),
        cardType: gatewayResponse.cardType,
        paymentGatewayProvider: activeProvider,
      },
    });

    // Apply payment to documents
    let remainingAmount = data.amount;
    const applications = [];

    for (const document of documents) {
      if (remainingAmount <= 0) break;

      const amountToApply = Math.min(remainingAmount, document.balanceDue);

      const application = await prisma.paymentApplication.create({
        data: {
          organizationId: user.organizationId,
          paymentId: payment.id,
          arDocumentId: document.id,
          amountApplied: amountToApply,
        },
      });

      applications.push(application);

      // Update document balance and status
      const newBalance = document.balanceDue - amountToApply;
      const newAmountPaid = document.amountPaid + amountToApply;

      let newStatus = document.status;
      if (newBalance === 0) {
        newStatus = "PAID";
      } else if (newAmountPaid > 0 && newBalance > 0) {
        newStatus = "PARTIAL";
      }

      await prisma.arDocument.update({
        where: { id: document.id },
        data: {
          balanceDue: newBalance,
          amountPaid: newAmountPaid,
          status: newStatus,
          paidDate: newBalance === 0 ? new Date() : null,
        },
      });

      remainingAmount -= amountToApply;
    }

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/clients/${data.customerId}`);
    data.documentIds.forEach((id) => revalidatePath(`/dashboard/documents/${id}`));

    return {
      success: true,
      data: {
        payment,
        applications,
        transactionId: gatewayResponse.transactionId,
      },
    };
  } catch (error: any) {
    console.error("Error processing credit card payment:", error);
    return { success: false, error: error.message || "Failed to process payment" };
  }
}

// Helper function to process Authorize.net transaction
async function processAuthorizeNetTransaction(params: {
  credentials: any;
  amount: number;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  billingAddress?: any;
  customerEmail?: string;
}): Promise<{
  success: boolean;
  transactionId?: string;
  cardType?: string;
  rawResponse?: any;
  error?: string;
}> {
  // This is a placeholder for the actual Authorize.net API integration
  // You'll need to implement the actual API call using the Authorize.net SDK
  // or make HTTP requests to their API

  const endpoint = params.credentials.isProduction
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";

  try {
    // Build the transaction request
    const transactionRequest = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: params.credentials.apiLoginId,
          transactionKey: params.credentials.transactionKey,
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: params.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: params.cardNumber,
              expirationDate: params.expirationDate,
              cardCode: params.cvv,
            },
          },
          billTo: params.billingAddress
            ? {
                firstName: params.billingAddress.firstName,
                lastName: params.billingAddress.lastName,
                address: params.billingAddress.address,
                city: params.billingAddress.city,
                state: params.billingAddress.state,
                zip: params.billingAddress.zip,
              }
            : undefined,
          customer: params.customerEmail
            ? {
                email: params.customerEmail,
              }
            : undefined,
        },
      },
    };

    // For now, return a mock successful response
    // In production, you'd make the actual API call here
    return {
      success: true,
      transactionId: `MOCK-${Date.now()}`,
      cardType: "Visa", // Would be detected from response
      rawResponse: {
        mockResponse: true,
        message: "This is a placeholder. Implement actual Authorize.net API call.",
      },
    };

    // Actual implementation would look something like:
    /*
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionRequest),
    });

    const result = await response.json();

    if (result.transactionResponse?.responseCode === '1') {
      return {
        success: true,
        transactionId: result.transactionResponse.transId,
        cardType: result.transactionResponse.accountType,
        rawResponse: result,
      };
    } else {
      return {
        success: false,
        error: result.transactionResponse?.errors?.[0]?.errorText || 'Transaction failed',
        rawResponse: result,
      };
    }
    */
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getPayments({
  customerId,
  page = 1,
  pageSize = 25,
}: {
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const skip = (page - 1) * pageSize;

  const where: any = {
    organizationId: user.organizationId,
  };

  if (customerId) {
    where.customerId = customerId;
  }

  const [payments, total] = await Promise.all([
    prisma.customerPayment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        paymentApplications: {
          include: {
            arDocument: {
              select: {
                id: true,
                documentNumber: true,
                documentType: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.customerPayment.count({ where }),
  ]);

  return {
    payments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createStripeCheckoutSession(data: {
  customerId: string;
  amount: number;
  documentIds: string[];
  mode: "pay_now" | "generate_link";
}) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can create payment sessions" };
  }

  try {
    // Get Stripe credentials
    const credentials = await getDecryptedStripeCredentials(user.organizationId);
    if (!credentials) {
      return {
        success: false,
        error: "Stripe not configured. Please contact support.",
      };
    }

    // Import checkout module
    const { createCheckoutSession } = await import("@/lib/payment-gateway/stripe/checkout");

    // Create checkout session
    const result = await createCheckoutSession(credentials, {
      organizationId: user.organizationId,
      customerId: data.customerId,
      documentIds: data.documentIds,
      amount: data.amount,
      mode: data.mode,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to create checkout session",
      };
    }

    // Return appropriate response based on mode
    if (data.mode === "pay_now") {
      // For embedded mode, return client secret instead of URL
      return {
        success: true,
        clientSecret: result.clientSecret, // For embedded checkout
        sessionId: result.sessionId,
      };
    } else {
      return {
        success: true,
        sessionUrl: result.sessionUrl, // Client will display this URL
        sessionId: result.sessionId,
      };
    }
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    return { success: false, error: error.message || "Failed to create checkout session" };
  }
}

export async function verifyCheckoutSession(sessionId: string) {
  try {
    // Find payment by stripeCheckoutSessionId
    const payment = await prisma.customerPayment.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      include: {
        customer: true,
        paymentApplications: {
          include: {
            arDocument: true,
          },
        },
      },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    // Check session status
    if (payment.checkoutSessionStatus === "open") {
      // Payment is still processing
      return {
        success: false,
        pending: true,
        error: "Payment is still processing. Please wait a moment and refresh.",
      };
    }

    if (payment.checkoutSessionStatus !== "complete") {
      return {
        success: false,
        error: "Payment session is not complete",
      };
    }

    // Return payment details
    return {
      success: true,
      paymentNumber: payment.paymentNumber,
      amount: payment.amount,
      transactionId: payment.gatewayTransactionId,
      customerId: payment.customerId,
      customerName: payment.customer.companyName,
      paymentDate: payment.paymentDate,
      documents: payment.paymentApplications.map((app) => ({
        id: app.arDocument.id,
        documentNumber: app.arDocument.documentNumber,
        documentType: app.arDocument.documentType,
        amountApplied: app.amountApplied,
      })),
    };
  } catch (error: any) {
    console.error("Error verifying checkout session:", error);
    return { success: false, error: error.message || "Failed to verify payment" };
  }
}

export async function markSessionCancelled(sessionId: string) {
  try {
    // Update payment to VOID status if still PENDING
    const result = await prisma.customerPayment.updateMany({
      where: {
        stripeCheckoutSessionId: sessionId,
        status: "PENDING", // Only update pending payments
      },
      data: {
        checkoutSessionStatus: "expired",
        status: "VOID",
      },
    });

    return { success: true, updated: result.count };
  } catch (error: any) {
    console.error("Error marking session as cancelled:", error);
    return { success: false, error: error.message || "Failed to update session" };
  }
}
