/**
 * Acumatica Filter Configuration Actions
 *
 * Server actions for configuring data filters
 */

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import {
  FilterConfig,
  isValidFilterConfig,
} from "@/lib/acumatica/config-types";
import { revalidatePath } from "next/cache";

/**
 * Save filter configuration
 */
export async function saveFilterConfig(
  integrationId: string,
  filterConfig: FilterConfig,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can configure filters");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    // Validate filter config
    if (!isValidFilterConfig(filterConfig)) {
      throw new Error("Invalid filter configuration");
    }

    await prisma.acumaticaIntegration.update({
      where: { id: integrationId },
      data: {
        filterConfig: filterConfig as any,
      },
    });

    revalidatePath("/dashboard/integrations/acumatica/setup");
  } catch (error) {
    console.error("[Save Filter Config] Error:", error);
    throw error;
  }
}

/**
 * Get current filter configuration
 */
export async function getFilterConfig(
  integrationId: string,
): Promise<FilterConfig | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can view filter configuration");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
    select: {
      organizationId: true,
      filterConfig: true,
    },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  return integration.filterConfig as FilterConfig | null;
}

/**
 * Get default filter configuration
 */
export async function getDefaultFilterConfig(): Promise<FilterConfig> {
  return {
    status: {
      field: "Status",
      allowedValues: ["Open"], // Only import Open status documents
    },
    documentType: {
      field: "Type",
      allowedValues: ["Invoice"],
    },
    dateRange: {
      field: "Date",
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(), // Start of current year
    },
    balanceFilter: {
      field: "Balance",
      operator: "gt", // Greater than
      value: 0, // Only import documents with a balance > 0
    },
  };
}

/**
 * Get available filter options from the schema
 */
export async function getFilterOptions(integrationId: string): Promise<{
  statusValues: string[];
  documentTypes: string[];
  dateFields: string[];
  branchFields: string[];
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can view filter options");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
    select: {
      organizationId: true,
      discoveredSchema: true,
      dataSourceType: true,
    },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  const schema = integration.discoveredSchema as any;

  // Default values for REST API Invoice entity
  // Note: "Balanced" status means fully paid, so we typically only want "Open" for AR collections
  const defaults = {
    statusValues: ["Open", "Hold", "Balanced", "Closed", "Voided"],
    documentTypes: ["Invoice", "Credit Memo", "Debit Memo", "Prepayment"],
    dateFields: ["Date", "DocDate", "DueDate"],
    branchFields: ["BranchID"],
  };

  // If we have a schema, try to extract more accurate options
  if (!schema?.fields) {
    return defaults;
  }

  // Find date-type fields
  const dateFields = schema.fields
    .filter((f: any) => f.type === "date" || f.type === "datetime")
    .map((f: any) => f.name);

  // Find branch-related fields
  const branchFields = schema.fields
    .filter((f: any) => f.name.toLowerCase().includes("branch"))
    .map((f: any) => f.name);

  return {
    statusValues: defaults.statusValues, // Would need to query Acumatica for actual values
    documentTypes: defaults.documentTypes, // Would need to query Acumatica for actual values
    dateFields: dateFields.length > 0 ? dateFields : defaults.dateFields,
    branchFields:
      branchFields.length > 0 ? branchFields : defaults.branchFields,
  };
}

/**
 * Validate filter configuration
 */
export async function validateFilterConfig(
  filterConfig: FilterConfig,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check required filters
  if (!filterConfig.status?.field) {
    errors.push("Status filter field is required");
  }

  if (
    !filterConfig.status?.allowedValues ||
    filterConfig.status.allowedValues.length === 0
  ) {
    errors.push("At least one status value must be allowed");
  }

  if (!filterConfig.dateRange?.field) {
    errors.push("Date range field is required");
  }

  if (!filterConfig.dateRange?.startDate) {
    errors.push("Date range start date is required");
  }

  // Validate date format
  if (filterConfig.dateRange?.startDate) {
    const startDate = new Date(filterConfig.dateRange.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push("Invalid start date format");
    }
  }

  if (filterConfig.dateRange?.endDate) {
    const endDate = new Date(filterConfig.dateRange.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push("Invalid end date format");
    }

    // Check that end date is after start date
    if (filterConfig.dateRange.startDate) {
      const startDate = new Date(filterConfig.dateRange.startDate);
      if (endDate < startDate) {
        errors.push("End date must be after start date");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
