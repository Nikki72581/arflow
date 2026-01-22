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
  paymentMethod: string; // Which payment method this cash account belongs to
  isARDefault: boolean;
}

export interface PaymentMethodsWithCashAccounts {
  paymentMethods: PaymentMethodOption[];
  cashAccounts: CashAccountOption[];
}

/**
 * Get current payment configuration settings
 */
export async function getPaymentConfigSettings(
  integrationId: string,
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
 * Fetch available payment methods and their allowed cash accounts from Acumatica
 * Cash accounts are nested within payment methods in Acumatica's API
 */
export async function fetchAcumaticaPaymentMethods(
  integrationId: string,
): Promise<{
  success: boolean;
  paymentMethods?: PaymentMethodOption[];
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return {
      success: false,
      error: "Only administrators can fetch payment methods",
    };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null =
    null;

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

    // Fetch payment methods with their allowed cash accounts
    const paymentMethods = await client.fetchPaymentMethods();

    // Transform to simplified format - only include AR-enabled payment methods
    const options: PaymentMethodOption[] = paymentMethods
      .filter((pm) => pm.UseInAR?.value === true)
      .map((pm) => ({
        id: pm.PaymentMethodID.value,
        description: pm.Description?.value || pm.PaymentMethodID.value,
        useInAR: pm.UseInAR?.value ?? false,
      }));

    return { success: true, paymentMethods: options };
  } catch (error) {
    console.error("[Payment Config] Error fetching payment methods:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch payment methods",
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
 * Fetch available cash accounts from Acumatica for a specific payment method
 * Cash accounts in Acumatica are defined per payment method in the AllowedCashAccounts detail
 */
export async function fetchAcumaticaCashAccounts(
  integrationId: string,
  paymentMethodId?: string,
): Promise<{
  success: boolean;
  cashAccounts?: CashAccountOption[];
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return {
      success: false,
      error: "Only administrators can fetch cash accounts",
    };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null =
    null;

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

    // Fetch payment methods with their allowed cash accounts
    const paymentMethods = await client.fetchPaymentMethods();

    // Extract cash accounts from payment methods
    const cashAccountsMap = new Map<string, CashAccountOption>();

    for (const pm of paymentMethods) {
      // Skip if filtering by payment method and this isn't the one we want
      if (paymentMethodId && pm.PaymentMethodID.value !== paymentMethodId) {
        continue;
      }

      // Skip if not enabled for AR
      if (pm.UseInAR?.value !== true) {
        continue;
      }

      // Extract cash accounts from this payment method
      const allowedAccounts = pm.AllowedCashAccounts || [];
      for (const ca of allowedAccounts) {
        // Only include cash accounts that are enabled for AR
        if (ca.UseInAR?.value !== true) {
          continue;
        }

        const cashAccountId = ca.CashAccount?.value;
        if (!cashAccountId) continue;

        // Use a composite key to handle same cash account in multiple payment methods
        const key = `${pm.PaymentMethodID.value}:${cashAccountId}`;

        if (!cashAccountsMap.has(key)) {
          cashAccountsMap.set(key, {
            id: cashAccountId,
            description: ca.Description?.value || cashAccountId,
            branch: ca.Branch?.value || null,
            paymentMethod: pm.PaymentMethodID.value,
            isARDefault: ca.ARDefault?.value ?? false,
          });
        }
      }
    }

    const options = Array.from(cashAccountsMap.values());

    // Sort by payment method, then by AR default (defaults first), then by ID
    options.sort((a, b) => {
      if (a.paymentMethod !== b.paymentMethod) {
        return a.paymentMethod.localeCompare(b.paymentMethod);
      }
      if (a.isARDefault !== b.isARDefault) {
        return a.isARDefault ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    });

    return { success: true, cashAccounts: options };
  } catch (error) {
    console.error("[Payment Config] Error fetching cash accounts:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch cash accounts",
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
 * Fetch both payment methods and cash accounts in a single API call
 * More efficient than making separate calls since cash accounts come from payment methods
 */
export async function fetchPaymentMethodsWithCashAccounts(
  integrationId: string,
): Promise<{
  success: boolean;
  data?: PaymentMethodsWithCashAccounts;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return {
      success: false,
      error: "Only administrators can fetch payment configuration",
    };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null =
    null;

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

    // Fetch payment methods with their allowed cash accounts
    const paymentMethodsData = await client.fetchPaymentMethods();

    const paymentMethods: PaymentMethodOption[] = [];
    const cashAccounts: CashAccountOption[] = [];

    for (const pm of paymentMethodsData) {
      // Only include AR-enabled payment methods
      if (pm.UseInAR?.value !== true) {
        continue;
      }

      paymentMethods.push({
        id: pm.PaymentMethodID.value,
        description: pm.Description?.value || pm.PaymentMethodID.value,
        useInAR: true,
      });

      // Extract cash accounts from this payment method
      const allowedAccounts = pm.AllowedCashAccounts || [];
      for (const ca of allowedAccounts) {
        // Only include cash accounts that are enabled for AR
        if (ca.UseInAR?.value !== true) {
          continue;
        }

        const cashAccountId = ca.CashAccount?.value;
        if (!cashAccountId) continue;

        cashAccounts.push({
          id: cashAccountId,
          description: ca.Description?.value || cashAccountId,
          branch: ca.Branch?.value || null,
          paymentMethod: pm.PaymentMethodID.value,
          isARDefault: ca.ARDefault?.value ?? false,
        });
      }
    }

    // Sort cash accounts by payment method, then by AR default, then by ID
    cashAccounts.sort((a, b) => {
      if (a.paymentMethod !== b.paymentMethod) {
        return a.paymentMethod.localeCompare(b.paymentMethod);
      }
      if (a.isARDefault !== b.isARDefault) {
        return a.isARDefault ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    });

    return {
      success: true,
      data: { paymentMethods, cashAccounts },
    };
  } catch (error) {
    console.error(
      "[Payment Config] Error fetching payment configuration:",
      error,
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch payment configuration",
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
  },
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
