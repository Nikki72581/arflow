"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole, UnmappedAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CustomerHandlingSettings {
  unmappedCustomerAction: UnmappedAction;
  defaultCustomerUserId: string | null;
}

/**
 * Get current customer handling settings
 */
export async function getCustomerHandlingSettings(
  integrationId: string
): Promise<CustomerHandlingSettings | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
      select: {
        organizationId: true,
        unmappedCustomerAction: true,
        defaultCustomerUserId: true,
      },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return null;
    }

    return {
      unmappedCustomerAction: integration.unmappedCustomerAction,
      defaultCustomerUserId: integration.defaultCustomerUserId,
    };
  } catch (error) {
    console.error("[Customer Settings] Error getting settings:", error);
    return null;
  }
}

/**
 * Update customer handling settings
 */
export async function updateCustomerHandlingSettings(
  integrationId: string,
  settings: {
    unmappedCustomerAction: UnmappedAction;
    defaultCustomerUserId?: string | null;
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

    // Validate that if DEFAULT_USER is selected, a user ID is provided
    if (
      settings.unmappedCustomerAction === "DEFAULT_USER" &&
      !settings.defaultCustomerUserId
    ) {
      return {
        success: false,
        error: "A default customer must be selected when using 'Assign to Default Customer' option",
      };
    }

    await prisma.acumaticaIntegration.update({
      where: { id: integrationId },
      data: {
        unmappedCustomerAction: settings.unmappedCustomerAction,
        defaultCustomerUserId:
          settings.unmappedCustomerAction === "DEFAULT_USER"
            ? settings.defaultCustomerUserId
            : null,
      },
    });

    revalidatePath("/dashboard/integrations/acumatica");
    revalidatePath("/dashboard/integrations/acumatica/setup");

    return { success: true };
  } catch (error) {
    console.error("[Customer Settings] Error updating settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}
