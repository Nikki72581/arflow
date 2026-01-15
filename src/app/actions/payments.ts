"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentGatewayProvider, PaymentStatus } from "@prisma/client";
import { getDecryptedCredentials } from "./authorize-net";
import { getDecryptedStripeCredentials } from "./stripe";
import { processStripePayment } from "@/lib/payment-gateway/stripe/client";
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
} from "@/lib/payment-gateway/stripe/webhook-handlers";

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
  status,
  search,
  paymentMethod,
}: {
  customerId?: string;
  page?: number;
  pageSize?: number;
  status?: PaymentStatus;
  search?: string;
  paymentMethod?: PaymentMethod;
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

  if (status) {
    where.status = status;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (search) {
    where.OR = [
      { paymentNumber: { contains: search, mode: "insensitive" } },
      { gatewayTransactionId: { contains: search, mode: "insensitive" } },
      { customer: { companyName: { contains: search, mode: "insensitive" } } },
    ];
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

export async function createStripePaymentIntent(data: {
  customerId: string;
  amount: number;
  documentIds: string[];
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

    const { createPaymentIntent } = await import(
      "@/lib/payment-gateway/stripe/payment-intent"
    );

    const result = await createPaymentIntent(credentials, {
      organizationId: user.organizationId,
      customerId: data.customerId,
      documentIds: data.documentIds,
      amount: data.amount,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to create payment intent",
      };
    }

    return {
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      paymentId: result.paymentId,
    };
  } catch (error: any) {
    console.error("Error creating Stripe payment intent:", error);
    return { success: false, error: error.message || "Failed to create payment intent" };
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

export async function verifyStripePayment(paymentIntentId: string) {
  try {
    const payment = await prisma.customerPayment.findFirst({
      where: { gatewayTransactionId: paymentIntentId },
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

    if (payment.status === "PENDING") {
      return {
        success: false,
        pending: true,
        error: "Payment is still processing. Please wait a moment and refresh.",
      };
    }

    if (payment.status !== "APPLIED") {
      return {
        success: false,
        error: "Payment is not complete",
      };
    }

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
    console.error("Error verifying Stripe payment:", error);
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

export async function requeryStripePayment(id: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can requery payments" };
  }

  try {
    const payment = await prisma.customerPayment.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

  if (payment.paymentGatewayProvider !== "STRIPE") {
    return { success: false, error: "Only Stripe payments can be requeried" };
  }

  if (!payment.gatewayTransactionId && !payment.stripeCheckoutSessionId) {
    return { success: false, error: "No Stripe payment found for this record" };
  }

  const credentials = await getDecryptedStripeCredentials(user.organizationId);
  if (!credentials) {
    return { success: false, error: "Stripe is not configured" };
  }

  if (payment.gatewayTransactionId) {
    const { retrievePaymentIntent } = await import(
      "@/lib/payment-gateway/stripe/payment-intent"
    );
    const { handlePaymentIntentFailed, handlePaymentIntentSucceeded } = await import(
      "@/lib/payment-gateway/stripe/webhook-handlers"
    );

    const paymentIntent = await retrievePaymentIntent(
      credentials,
      payment.gatewayTransactionId
    );

    if (!paymentIntent) {
      return { success: false, error: "Unable to retrieve Stripe payment intent" };
    }

    if (paymentIntent.status === "succeeded") {
      await handlePaymentIntentSucceeded(paymentIntent);
    } else if (paymentIntent.status === "canceled") {
      await prisma.customerPayment.update({
        where: { id: payment.id },
        data: {
          status: "VOID",
          checkoutSessionStatus: paymentIntent.status,
          gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)),
        },
      });
    } else if (paymentIntent.status === "requires_payment_method") {
      await handlePaymentIntentFailed(paymentIntent);
    } else {
      await prisma.customerPayment.update({
        where: { id: payment.id },
        data: {
          checkoutSessionStatus: paymentIntent.status,
          gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)),
        },
      });
    }

    revalidatePath(`/dashboard/payments/${payment.id}`);
    revalidatePath("/dashboard/payments");

    return { success: true, status: paymentIntent.status };
  }

  const { retrieveCheckoutSession } = await import(
    "@/lib/payment-gateway/stripe/checkout"
  );

  const session = await retrieveCheckoutSession(
    credentials,
    payment.stripeCheckoutSessionId as string
  );

  if (!session) {
    return { success: false, error: "Unable to retrieve Stripe session" };
  }

  const sessionStatus = session.status || "open";

  if (sessionStatus === "complete") {
    await handleCheckoutSessionCompleted(session);
  } else if (sessionStatus === "expired") {
    await handleCheckoutSessionExpired(session);
  } else {
    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        checkoutSessionStatus: sessionStatus,
        sessionExpiresAt: session.expires_at
          ? new Date(session.expires_at * 1000)
          : payment.sessionExpiresAt,
        gatewayResponse: JSON.parse(JSON.stringify(session)),
      },
    });
  }

  revalidatePath(`/dashboard/payments/${payment.id}`);
  revalidatePath("/dashboard/payments");

    return { success: true, status: sessionStatus };
  } catch (error: any) {
    console.error("Error requerying Stripe payment:", error);
    return { success: false, error: error.message || "Failed to requery Stripe" };
  }
}

export async function getPaymentById(id: string) {
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

  const payment = await prisma.customerPayment.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          customerNumber: true,
          email: true,
          phone: true,
        },
      },
      paymentApplications: {
        include: {
          arDocument: {
            select: {
              id: true,
              documentNumber: true,
              documentType: true,
              totalAmount: true,
              dueDate: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return payment;
}

export async function getOpenDocumentsForPayment(customerId: string) {
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

  const documents = await prisma.arDocument.findMany({
    where: {
      organizationId: user.organizationId,
      customerId,
      balanceDue: {
        gt: 0,
      },
      status: {
        not: "VOID",
      },
    },
    select: {
      id: true,
      documentNumber: true,
      documentType: true,
      totalAmount: true,
      balanceDue: true,
      dueDate: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return documents;
}

export async function applyPaymentToDocuments(data: {
  paymentId: string;
  applications: { documentId: string; amount: number }[];
}) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can apply payments" };
  }

  try {
    const payment = await prisma.customerPayment.findFirst({
      where: {
        id: data.paymentId,
        organizationId: user.organizationId,
      },
      include: {
        paymentApplications: true,
      },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.status === "VOID") {
      return { success: false, error: "Cannot apply a voided payment" };
    }

    if (!data.applications || data.applications.length === 0) {
      return { success: false, error: "Select at least one document to apply" };
    }

    const alreadyApplied = payment.paymentApplications.reduce(
      (sum, app) => sum + app.amountApplied,
      0
    );
    const remainingAmount = payment.amount - alreadyApplied;

    if (remainingAmount <= 0) {
      return { success: false, error: "This payment is already fully applied" };
    }

    const totalToApply = data.applications.reduce(
      (sum, app) => sum + app.amount,
      0
    );

    if (totalToApply > remainingAmount) {
      return {
        success: false,
        error: "Applied amount exceeds the remaining payment balance",
      };
    }

    const documentIds = data.applications.map((app) => app.documentId);
    const documents = await prisma.arDocument.findMany({
      where: {
        id: { in: documentIds },
        organizationId: user.organizationId,
        customerId: payment.customerId,
      },
    });

    if (documents.length !== documentIds.length) {
      return { success: false, error: "One or more documents not found" };
    }

    const documentMap = new Map(documents.map((doc) => [doc.id, doc]));

    await prisma.$transaction(async (tx) => {
      for (const application of data.applications) {
        const document = documentMap.get(application.documentId);
        if (!document) {
          throw new Error("Document not found");
        }

        if (application.amount <= 0) {
          throw new Error("Applied amount must be greater than zero");
        }

        if (application.amount > document.balanceDue) {
          throw new Error("Applied amount exceeds document balance due");
        }

        await tx.paymentApplication.create({
          data: {
            organizationId: user.organizationId,
            paymentId: payment.id,
            arDocumentId: document.id,
            amountApplied: application.amount,
          },
        });

        const newBalance = document.balanceDue - application.amount;
        const newAmountPaid = document.amountPaid + application.amount;

        let newStatus = document.status;
        if (newBalance === 0) {
          newStatus = "PAID";
        } else if (newAmountPaid > 0 && newBalance > 0) {
          newStatus = "PARTIAL";
        }

        await tx.arDocument.update({
          where: { id: document.id },
          data: {
            balanceDue: newBalance,
            amountPaid: newAmountPaid,
            status: newStatus,
            paidDate: newBalance === 0 ? new Date() : null,
          },
        });
      }

      if (payment.status !== "APPLIED") {
        await tx.customerPayment.update({
          where: { id: payment.id },
          data: {
            status: "APPLIED",
          },
        });
      }
    });

    revalidatePath(`/dashboard/payments/${payment.id}`);
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/clients/${payment.customerId}`);
    documentIds.forEach((id) => revalidatePath(`/dashboard/documents/${id}`));

    return { success: true };
  } catch (error: any) {
    console.error("Error applying payment:", error);
    return { success: false, error: error.message || "Failed to apply payment" };
  }
}

export async function updatePaymentMethodInfo(data: {
  paymentId: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can update payments" };
  }

  try {
    const payment = await prisma.customerPayment.findFirst({
      where: {
        id: data.paymentId,
        organizationId: user.organizationId,
      },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.status === "VOID") {
      return { success: false, error: "Cannot update a voided payment" };
    }

    const shouldMarkApplied =
      payment.status === "PENDING" && data.paymentMethod !== "CREDIT_CARD";

    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber || null,
        status: shouldMarkApplied ? "APPLIED" : payment.status,
      },
    });

    revalidatePath(`/dashboard/payments/${payment.id}`);
    revalidatePath("/dashboard/payments");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return { success: false, error: error.message || "Failed to update payment" };
  }
}

export async function voidPayment(id: string, reason?: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Only admins can void payments" };
  }

  try {
    // Get the payment with its applications
    const payment = await prisma.customerPayment.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
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

    if (payment.status !== "APPLIED") {
      return { success: false, error: "Only applied payments can be voided" };
    }

    // Use a transaction to update payment and documents atomically
    await prisma.$transaction(async (tx) => {
      // Update payment status to VOID
      await tx.customerPayment.update({
        where: { id },
        data: {
          status: "VOID",
          notes: reason ? `${payment.notes || ""}\n\nVoided: ${reason}`.trim() : payment.notes,
        },
      });

      // Restore document balances
      for (const application of payment.paymentApplications) {
        const document = application.arDocument;
        const newBalance = document.balanceDue + application.amountApplied;
        const newAmountPaid = document.amountPaid - application.amountApplied;

        let newStatus = document.status;
        if (newAmountPaid === 0) {
          newStatus = "OPEN";
        } else if (newAmountPaid > 0 && newBalance > 0) {
          newStatus = "PARTIAL";
        }

        await tx.arDocument.update({
          where: { id: document.id },
          data: {
            balanceDue: newBalance,
            amountPaid: newAmountPaid,
            status: newStatus,
            paidDate: newStatus === "PAID" ? document.paidDate : null,
          },
        });
      }

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "payment_voided",
          entityType: "payment",
          entityId: id,
          description: `Voided payment ${payment.paymentNumber}${reason ? `: ${reason}` : ""}`,
          metadata: {
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            reason,
          },
        },
      });
    });

    // Revalidate affected pages
    revalidatePath("/dashboard/payments");
    revalidatePath(`/dashboard/payments/${id}`);
    revalidatePath("/dashboard/documents");
    payment.paymentApplications.forEach((app) => {
      revalidatePath(`/dashboard/documents/${app.arDocumentId}`);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error voiding payment:", error);
    return { success: false, error: error.message || "Failed to void payment" };
  }
}
