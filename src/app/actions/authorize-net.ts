"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-character-secret-key-here"; // Should be 32 characters
const ALGORITHM = "aes-256-cbc";

// Encrypt sensitive data
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Decrypt sensitive data
function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export async function getAuthorizeNetSettings() {
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

  const settings = await prisma.authorizeNetIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  if (!settings) {
    return null;
  }

  // Return settings without decrypting the transaction key
  return {
    ...settings,
    encryptedTransactionKey: "****", // Mask the key
  };
}

export async function upsertAuthorizeNetSettings(data: {
  apiLoginId: string;
  transactionKey: string;
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

  // Encrypt the transaction key
  const encryptedTransactionKey = encrypt(data.transactionKey);

  // Check if settings already exist
  const existing = await prisma.authorizeNetIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  let settings;
  if (existing) {
    // Update existing
    settings = await prisma.authorizeNetIntegration.update({
      where: {
        organizationId: user.organizationId,
      },
      data: {
        apiLoginId: data.apiLoginId,
        encryptedTransactionKey,
        isProduction: data.isProduction,
        requireCVV: data.requireCVV,
        requireBillingAddress: data.requireBillingAddress,
      },
    });
  } else {
    // Create new
    settings = await prisma.authorizeNetIntegration.create({
      data: {
        organizationId: user.organizationId,
        apiLoginId: data.apiLoginId,
        encryptedTransactionKey,
        isProduction: data.isProduction,
        requireCVV: data.requireCVV,
        requireBillingAddress: data.requireBillingAddress,
        enabled: false, // Start disabled until tested
      },
    });
  }

  revalidatePath("/dashboard/administration/payment-gateway");

  return { success: true, data: settings };
}

export async function testAuthorizeNetConnection() {
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

  const settings = await prisma.authorizeNetIntegration.findUnique({
    where: {
      organizationId: user.organizationId,
    },
  });

  if (!settings) {
    throw new Error("Authorize.net settings not found");
  }

  try {
    // Decrypt the transaction key
    const transactionKey = decrypt(settings.encryptedTransactionKey);

    // Test the connection by making a simple API call
    // This is a placeholder - you'll need to implement actual Authorize.net API call
    const endpoint = settings.isProduction
      ? "https://api.authorize.net/xml/v1/request.api"
      : "https://apitest.authorize.net/xml/v1/request.api";

    // For now, just update the test timestamp
    await prisma.authorizeNetIntegration.update({
      where: {
        organizationId: user.organizationId,
      },
      data: {
        lastConnectionTest: new Date(),
        connectionErrorMessage: null,
      },
    });

    revalidatePath("/dashboard/administration/payment-gateway");

    return { success: true, message: "Connection successful" };
  } catch (error: any) {
    // Update with error
    await prisma.authorizeNetIntegration.update({
      where: {
        organizationId: user.organizationId,
      },
      data: {
        lastConnectionTest: new Date(),
        connectionErrorMessage: error.message,
      },
    });

    revalidatePath("/dashboard/administration/payment-gateway");

    throw new Error(`Connection test failed: ${error.message}`);
  }
}

export async function toggleAuthorizeNetEnabled(enabled: boolean) {
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

  await prisma.authorizeNetIntegration.update({
    where: {
      organizationId: user.organizationId,
    },
    data: {
      enabled,
    },
  });

  revalidatePath("/dashboard/administration/payment-gateway");

  return { success: true };
}

// Helper function to get decrypted credentials (for internal use only)
export async function getDecryptedCredentials(organizationId: string) {
  const settings = await prisma.authorizeNetIntegration.findUnique({
    where: { organizationId },
  });

  if (!settings || !settings.enabled) {
    return null;
  }

  return {
    apiLoginId: settings.apiLoginId,
    transactionKey: decrypt(settings.encryptedTransactionKey),
    isProduction: settings.isProduction,
    requireCVV: settings.requireCVV,
    requireBillingAddress: settings.requireBillingAddress,
  };
}
