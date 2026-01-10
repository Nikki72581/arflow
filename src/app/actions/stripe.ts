"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  encryptGatewayCredential,
  decryptGatewayCredential,
} from "@/lib/payment-gateway/encryption";
import { testStripeConnection as testStripeConnectionClient } from "@/lib/payment-gateway/stripe/client";

/**
 * Get Stripe settings for the current organization
 */
export async function getStripeSettings() {
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

  const settings = await prisma.stripeIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  if (!settings) {
    return null;
  }

  // Return settings with masked credentials
  return {
    ...settings,
    encryptedSecretKey: "****",
    encryptedPublishableKey: "****",
    encryptedWebhookSecret: settings.encryptedWebhookSecret ? "****" : null,
  };
}

/**
 * Create or update Stripe settings
 */
export async function upsertStripeSettings(data: {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  isProduction: boolean;
  requireCVV: boolean;
  requireBillingAddress: boolean;
}) {
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

  // Encrypt the credentials
  const encryptedSecretKey = encryptGatewayCredential(data.secretKey);
  const encryptedPublishableKey = encryptGatewayCredential(data.publishableKey);
  const encryptedWebhookSecret = data.webhookSecret
    ? encryptGatewayCredential(data.webhookSecret)
    : null;

  // Check if settings already exist
  const existing = await prisma.stripeIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  let settings;
  if (existing) {
    // Update existing settings
    settings = await prisma.stripeIntegration.update({
      where: {
        organizationId: user.organizationId,
      },
      data: {
        encryptedSecretKey,
        encryptedPublishableKey,
        encryptedWebhookSecret,
        isProduction: data.isProduction,
        requireCVV: data.requireCVV,
        requireBillingAddress: data.requireBillingAddress,
      },
    });
  } else {
    // Create new settings
    settings = await prisma.stripeIntegration.create({
      data: {
        organizationId: user.organizationId,
        encryptedSecretKey,
        encryptedPublishableKey,
        encryptedWebhookSecret,
        isProduction: data.isProduction,
        requireCVV: data.requireCVV,
        requireBillingAddress: data.requireBillingAddress,
        enabled: false, // Will be enabled after successful connection test
      },
    });
  }

  revalidatePath("/dashboard/administration/payment-providers");

  return {
    success: true,
    data: {
      ...settings,
      encryptedSecretKey: "****",
      encryptedPublishableKey: "****",
      encryptedWebhookSecret: settings.encryptedWebhookSecret ? "****" : null,
    },
  };
}

/**
 * Test Stripe connection
 */
export async function testStripeConnection() {
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

  const settings = await prisma.stripeIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  if (!settings) {
    throw new Error("Stripe is not configured");
  }

  try {
    // Decrypt credentials
    const secretKey = decryptGatewayCredential(settings.encryptedSecretKey);
    const publishableKey = decryptGatewayCredential(
      settings.encryptedPublishableKey
    );

    // Test the connection
    const result = await testStripeConnectionClient({
      secretKey,
      publishableKey,
      isProduction: settings.isProduction,
    });

    // Update the connection test result
    await prisma.stripeIntegration.update({
      where: {
        organizationId: user.organizationId,
      },
      data: {
        lastConnectionTest: new Date(),
        connectionErrorMessage: result.success ? null : result.error,
      },
    });

    revalidatePath("/dashboard/administration/payment-providers");

    if (result.success) {
      return {
        success: true,
        message: "Connection successful",
      };
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    // Update with error
    await prisma.stripeIntegration.update({
      where: {
        organizationId: user.organizationId,
      },
      data: {
        lastConnectionTest: new Date(),
        connectionErrorMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });

    revalidatePath("/dashboard/administration/payment-providers");

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle Stripe integration enabled status
 */
export async function toggleStripeEnabled(enabled: boolean) {
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

  const settings = await prisma.stripeIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  if (!settings) {
    throw new Error("Stripe is not configured");
  }

  await prisma.stripeIntegration.update({
    where: {
      organizationId: user.organizationId,
    },
    data: {
      enabled,
    },
  });

  revalidatePath("/dashboard/administration/payment-providers");

  return {
    success: true,
    enabled,
  };
}

/**
 * Get decrypted Stripe credentials for internal use
 * (for payment processing)
 */
export async function getDecryptedStripeCredentials(organizationId: string) {
  const settings = await prisma.stripeIntegration.findUnique({
    where: {
      organizationId,
    },
  });

  if (!settings || !settings.enabled) {
    return null;
  }

  return {
    secretKey: decryptGatewayCredential(settings.encryptedSecretKey),
    publishableKey: decryptGatewayCredential(settings.encryptedPublishableKey),
    isProduction: settings.isProduction,
    requireCVV: settings.requireCVV,
    requireBillingAddress: settings.requireBillingAddress,
  };
}

/**
 * Get Stripe publishable key for client-side use
 * This is safe to expose to the client
 */
export async function getStripePublishableKey() {
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

  const settings = await prisma.stripeIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  if (!settings || !settings.enabled) {
    return null;
  }

  return decryptGatewayCredential(settings.encryptedPublishableKey);
}
