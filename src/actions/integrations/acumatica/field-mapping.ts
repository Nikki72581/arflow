/**
 * Acumatica Field Mapping Actions
 *
 * Server actions for configuring field mappings
 */

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import {
  FieldMappingConfig,
  AutoSuggestResult,
  FieldSuggestion,
  FieldInfo,
  isValidFieldMapping,
} from "@/lib/acumatica/config-types";
import { revalidatePath } from "next/cache";

/**
 * Save field mappings configuration
 */
export async function saveFieldMappings(
  integrationId: string,
  fieldMappings: FieldMappingConfig
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can configure field mappings");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    // Validate field mappings
    if (!isValidFieldMapping(fieldMappings)) {
      throw new Error("Invalid field mapping configuration");
    }

    await prisma.acumaticaIntegration.update({
      where: { id: integrationId },
      data: {
        fieldMappings: fieldMappings as any,
      },
    });

    revalidatePath("/dashboard/integrations/acumatica/setup");
  } catch (error) {
    console.error("[Save Field Mappings] Error:", error);
    throw error;
  }
}

/**
 * Get current field mappings
 */
export async function getFieldMappings(
  integrationId: string
): Promise<FieldMappingConfig | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can view field mappings");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
    select: {
      organizationId: true,
      fieldMappings: true,
    },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  return integration.fieldMappings as FieldMappingConfig | null;
}

/**
 * Auto-suggest field mappings based on field names
 */
export async function autoSuggestFieldMappings(
  integrationId: string
): Promise<AutoSuggestResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can use auto-suggest");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
      select: {
        organizationId: true,
        discoveredSchema: true,
      },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    const schema = integration.discoveredSchema as any;
    if (!schema?.fields) {
      throw new Error("Schema not discovered yet");
    }

    const fields: FieldInfo[] = schema.fields;

    // Auto-suggest logic based on common field names
    const suggestions: AutoSuggestResult = {};

    // Amount field
    const amountField = findBestMatch(fields, [
      "Amount",
      "DocTotal",
      "Total",
      "InvoiceAmount",
      "NetAmount",
    ]);
    if (amountField) {
      suggestions.amount = {
        sourceField: amountField.name,
        confidence: amountField.confidence,
        reason: `Matched common amount field name: ${amountField.name}`,
      };
    }

    // Date field
    const dateField = findBestMatch(fields, ["Date", "DocDate", "InvoiceDate", "TransactionDate"]);
    if (dateField) {
      suggestions.date = {
        sourceField: dateField.name,
        confidence: dateField.confidence,
        reason: `Matched common date field name: ${dateField.name}`,
      };
    }

    // Salesperson field
    const salespersonField = findBestMatch(fields, [
      "Commissions/SalesPersons/SalespersonID",
      "SalespersonID",
      "Salesperson",
      "Details/SalespersonID",
    ]);
    if (salespersonField) {
      suggestions.salesperson = {
        sourceField: salespersonField.name,
        confidence: salespersonField.confidence,
        reason: `Matched common salesperson field: ${salespersonField.name}`,
      };
    }

    // Unique ID field
    const uniqueIdField = findBestMatch(fields, [
      "ReferenceNbr",
      "RefNbr",
      "InvoiceNbr",
      "DocumentNbr",
      "ID",
    ]);
    if (uniqueIdField) {
      suggestions.uniqueId = {
        sourceField: uniqueIdField.name,
        confidence: uniqueIdField.confidence,
        reason: `Matched common unique ID field: ${uniqueIdField.name}`,
      };
    }

    // Customer field
    const customerField = findBestMatch(fields, [
      "CustomerID",
      "Customer",
      "CustomerId",
      "BAccountID",
    ]);
    if (customerField) {
      suggestions.customer = {
        sourceField: customerField.name,
        confidence: customerField.confidence,
        reason: `Matched common customer field: ${customerField.name}`,
      };
    }

    // Project field
    const projectField = findBestMatch(fields, ["Project", "ProjectID", "ProjectCode"]);
    if (projectField) {
      suggestions.project = {
        sourceField: projectField.name,
        confidence: projectField.confidence,
        reason: `Matched common project field: ${projectField.name}`,
      };
    }

    return suggestions;
  } catch (error) {
    console.error("[Auto-Suggest Field Mappings] Error:", error);
    throw error;
  }
}

/**
 * Helper function to find the best matching field
 */
function findBestMatch(
  fields: FieldInfo[],
  candidates: string[]
): { name: string; confidence: "high" | "medium" | "low" } | null {
  // Try exact matches first
  for (const candidate of candidates) {
    const exactMatch = fields.find((f) => f.name === candidate);
    if (exactMatch) {
      return { name: exactMatch.name, confidence: "high" };
    }
  }

  // Try case-insensitive matches
  for (const candidate of candidates) {
    const caseInsensitiveMatch = fields.find(
      (f) => f.name.toLowerCase() === candidate.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      return { name: caseInsensitiveMatch.name, confidence: "high" };
    }
  }

  // Try partial matches (contains)
  for (const candidate of candidates) {
    const partialMatch = fields.find((f) =>
      f.name.toLowerCase().includes(candidate.toLowerCase())
    );
    if (partialMatch) {
      return { name: partialMatch.name, confidence: "medium" };
    }
  }

  // Try reverse partial match (candidate contains field name)
  for (const candidate of candidates) {
    const reverseMatch = fields.find((f) =>
      candidate.toLowerCase().includes(f.name.toLowerCase())
    );
    if (reverseMatch) {
      return { name: reverseMatch.name, confidence: "low" };
    }
  }

  return null;
}

/**
 * Validate field mappings
 */
export async function validateFieldMappings(
  fieldMappings: FieldMappingConfig
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check required fields
  if (!fieldMappings.amount?.sourceField) {
    errors.push("Amount field mapping is required");
  }

  if (!fieldMappings.date?.sourceField) {
    errors.push("Date field mapping is required");
  }

  if (!fieldMappings.salesperson?.sourceField) {
    errors.push("Salesperson field mapping is required");
  }

  if (!fieldMappings.uniqueId?.sourceField) {
    errors.push("Unique ID field mapping is required");
  }

  if (!fieldMappings.customer?.idField) {
    errors.push("Customer ID field mapping is required");
  }

  if (!fieldMappings.importLevel) {
    errors.push("Import level is required");
  }

  // Check line-level specific requirements
  if (fieldMappings.importLevel === "LINE_LEVEL") {
    if (!fieldMappings.lineAmount?.sourceField) {
      errors.push("Line amount field mapping is required for line-level imports");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
