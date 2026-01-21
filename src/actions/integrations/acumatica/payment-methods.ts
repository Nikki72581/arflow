"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";
import { revalidatePath } from "next/cache";

export interface PaymentMethodInfo {
  id: string;
  description: string;
  isActive: boolean;
  useForAR: boolean;
}

/**
 * Discover available payment methods from Acumatica
 */
export async function discoverPaymentMethods(
  integrationId: string
): Promise<PaymentMethodInfo[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can discover payment methods");
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | null = null;

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    client = await createAuthenticatedClient(integration);

    // Fetch payment methods from Acumatica
    // PaymentMethod endpoint in Acumatica REST API
    const url = `/entity/Default/${integration.apiVersion}/PaymentMethod?$select=PaymentMethodID,Description,Active,UseInAR`;

    console.log("[Payment Methods] Fetching from:", url);

    const response = await client.makeRequest("GET", url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payment Methods] API error:", errorText);
      throw new Error(`Failed to fetch payment methods: ${response.status}`);
    }

    const data = await response.json();
    const methods = Array.isArray(data) ? data : (data.value || []);

    console.log(`[Payment Methods] Found ${methods.length} payment methods`);

    // Map to our interface
    const paymentMethods: PaymentMethodInfo[] = methods.map((method: any) => ({
      id: method.PaymentMethodID?.value || method.PaymentMethodID || "",
      description: method.Description?.value || method.Description || "",
      isActive: method.Active?.value ?? method.Active ?? true,
      useForAR: method.UseInAR?.value ?? method.UseInAR ?? true,
    }));

    // Filter to only active AR payment methods
    return paymentMethods.filter(pm => pm.isActive && pm.useForAR);
  } catch (error) {
    console.error("[Payment Methods] Error:", error);
    throw error;
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (e) {
        console.error("[Payment Methods] Logout error:", e);
      }
    }
  }
}

/**
 * Save the payment method filter configuration
 */
export async function savePaymentMethodFilter(
  integrationId: string,
  mode: "ALL" | "SELECTED",
  selectedPaymentMethods: string[]
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can configure payment method filters");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    // Get current filter config
    const currentFilterConfig = (integration.filterConfig as any) || {};

    // Determine the payment method field based on entity type
    const paymentMethodField = integration.dataSourceEntity === "SalesOrder"
      ? "PaymentMethod"
      : "FinancialDetails/PaymentMethod";

    // Update filter config with payment method settings
    const updatedFilterConfig = {
      ...currentFilterConfig,
      paymentMethod: {
        field: paymentMethodField,
        mode: mode,
        selectedValues: mode === "SELECTED" ? selectedPaymentMethods : undefined,
      },
    };

    await prisma.acumaticaIntegration.update({
      where: { id: integrationId },
      data: {
        filterConfig: updatedFilterConfig,
      },
    });

    revalidatePath("/dashboard/integrations/acumatica/setup");
    revalidatePath("/dashboard/integrations/acumatica/setup/payment-methods");
  } catch (error) {
    console.error("[Payment Methods] Error saving filter:", error);
    throw error;
  }
}

/**
 * Get current payment method filter configuration
 */
export async function getPaymentMethodFilter(
  integrationId: string
): Promise<{ mode: "ALL" | "SELECTED"; selectedValues: string[] } | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return null;
    }

    const filterConfig = integration.filterConfig as any;

    if (!filterConfig?.paymentMethod) {
      return { mode: "ALL", selectedValues: [] };
    }

    return {
      mode: filterConfig.paymentMethod.mode || "ALL",
      selectedValues: filterConfig.paymentMethod.selectedValues || [],
    };
  } catch (error) {
    console.error("[Payment Methods] Error getting filter:", error);
    return null;
  }
}
