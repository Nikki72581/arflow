"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";

export interface PaymentConfigSettings {
  defaultPaymentMethod: string | null;
  defaultCashAccount: string | null;
  autoSyncPayments: boolean;
}

export interface PaymentMethodOption {
  id: string;
  description: string;
  useInAR: boolean;
}

export interface CashAccountOption {
  id: string;
  description: string;
  branch: string | null;
}

/**
 * Get current payment configuration settings
 */
export async function getPaymentConfigSettings(
  integrationId: string
): Promise<PaymentConfigSettings | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
      select: {
        organizationId: true,
        defaultPaymentMethod: true,
        defaultCashAccount: true,
        autoSyncPayments: true,
      },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return null;
    }

    return {
      defaultPaymentMethod: integration.defaultPaymentMethod,
      defaultCashAccount: integration.defaultCashAccount,
      autoSyncPayments: integration.autoSyncPayments ?? false,
    };
  } catch (error) {
    console.error("[Payment Config] Error getting settings:", error);
    return null;
  }
}

/**
 * Fetch available payment methods from Acumatica
 */
export async function fetchAcumaticaPaymentMethods(
  integrationId: string
): Promise<{ success: boolean; paymentMethods?: PaymentMethodOption[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return { success: false, error: "Only administrators can fetch payment methods" };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null = null;

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return { success: false, error: "Integration not found" };
    }

    if (integration.status !== "ACTIVE") {
      return { success: false, error: "Integration is not active" };
    }

    // Create authenticated client
    client = await createAuthenticatedClient(integration);

    // Fetch payment methods
    const paymentMethods = await client.fetchPaymentMethods();

    // Transform to simplified format
    const options: PaymentMethodOption[] = paymentMethods
      .filter((pm) => pm.UseInAR?.value !== false) // Include if UseInAR is true or undefined
      .map((pm) => ({
        id: pm.PaymentMethodID.value,
        description: pm.Description?.value || pm.PaymentMethodID.value,
        useInAR: pm.UseInAR?.value ?? true,
      }));

    return { success: true, paymentMethods: options };
  } catch (error) {
    console.error("[Payment Config] Error fetching payment methods:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payment methods",
    };
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (logoutError) {
        console.error("[Payment Config] Failed to logout:", logoutError);
      }
    }
  }
}

/**
 * Fetch available cash accounts from Acumatica
 */
export async function fetchAcumaticaCashAccounts(
  integrationId: string
): Promise<{ success: boolean; cashAccounts?: CashAccountOption[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return { success: false, error: "Only administrators can fetch cash accounts" };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null = null;

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return { success: false, error: "Integration not found" };
    }

    if (integration.status !== "ACTIVE") {
      return { success: false, error: "Integration is not active" };
    }

    // Create authenticated client
    client = await createAuthenticatedClient(integration);

    // Fetch cash accounts
    const cashAccounts = await client.fetchCashAccounts();

    // Transform to simplified format
    const options: CashAccountOption[] = cashAccounts.map((ca) => ({
      id: ca.CashAccountCD.value,
      description: ca.Description?.value || ca.CashAccountCD.value,
      branch: ca.Branch?.value || null,
    }));

    return { success: true, cashAccounts: options };
  } catch (error) {
    console.error("[Payment Config] Error fetching cash accounts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cash accounts",
    };
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (logoutError) {
        console.error("[Payment Config] Failed to logout:", logoutError);
      }
    }
  }
}

/**
 * Save payment configuration settings
 */
export async function savePaymentConfiguration(
  integrationId: string,
  config: {
    defaultPaymentMethod: string;
    defaultCashAccount: string;
    autoSyncPayments?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return { success: false, error: "Only administrators can update settings" };
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return { success: false, error: "Integration not found" };
    }

    // Validate required fields
    if (!config.defaultPaymentMethod || !config.defaultCashAccount) {
      return {
        success: false,
        error: "Both payment method and cash account are required",
      };
    }

    await prisma.acumaticaIntegration.update({
      where: { id: integrationId },
      data: {
        defaultPaymentMethod: config.defaultPaymentMethod,
        defaultCashAccount: config.defaultCashAccount,
        autoSyncPayments: config.autoSyncPayments ?? false,
      },
    });

    revalidatePath("/dashboard/integrations/acumatica");

    return { success: true };
  } catch (error) {
    console.error("[Payment Config] Error saving settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}
