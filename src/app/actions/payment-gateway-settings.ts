"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { PaymentGatewayProvider } from "@prisma/client";

/**
 * Get the current active payment gateway provider for the organization
 */
export async function getActiveProvider() {
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

  const settings = await prisma.paymentGatewaySettings.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  return settings?.activeProvider || null;
}

/**
 * Set the active payment gateway provider
 */
export async function setActiveProvider(provider: PaymentGatewayProvider | null) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }

  // Validate that the provider is configured and enabled before activation
  if (provider === "AUTHORIZE_NET") {
    const authorizeNet = await prisma.authorizeNetIntegration.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!authorizeNet || !authorizeNet.enabled) {
      throw new Error("Authorize.net is not configured or not enabled");
    }
  } else if (provider === "STRIPE") {
    const stripe = await prisma.stripeIntegration.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!stripe || !stripe.enabled) {
      throw new Error("Stripe is not configured or not enabled");
    }
  }

  // Upsert the payment gateway settings
  const settings = await prisma.paymentGatewaySettings.upsert({
    where: {
      organizationId: user.organizationId,
    },
    create: {
      organizationId: user.organizationId,
      activeProvider: provider,
    },
    update: {
      activeProvider: provider,
    },
  });

  revalidatePath("/dashboard/administration/payment-providers");

  return {
    success: true,
    data: settings,
  };
}

/**
 * Get the status of all payment gateway providers
 */
export async function getProviderStatuses() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }

  // Get all provider configurations
  const [authorizeNet, stripe, gatewaySettings] = await Promise.all([
    prisma.authorizeNetIntegration.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.stripeIntegration.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.paymentGatewaySettings.findUnique({
      where: { organizationId: user.organizationId },
    }),
  ]);

  const activeProvider = gatewaySettings?.activeProvider || null;

  return {
    activeProvider,
    providers: {
      AUTHORIZE_NET: {
        configured: !!authorizeNet,
        enabled: authorizeNet?.enabled || false,
        isActive: activeProvider === "AUTHORIZE_NET",
        lastConnectionTest: authorizeNet?.lastConnectionTest,
        connectionError: authorizeNet?.connectionErrorMessage,
        isProduction: authorizeNet?.isProduction || false,
      },
      STRIPE: {
        configured: !!stripe,
        enabled: stripe?.enabled || false,
        isActive: activeProvider === "STRIPE",
        lastConnectionTest: stripe?.lastConnectionTest,
        connectionError: stripe?.connectionErrorMessage,
        isProduction: stripe?.isProduction || false,
      },
    },
  };
}
