/**
 * Acumatica Data Preview Actions
 *
 * Preview and validate data before committing to integration configuration.
 */

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";
import { AcumaticaQueryBuilder } from "@/lib/acumatica/query-builder";
import { FieldExtractor } from "@/lib/acumatica/field-extractor";
import {
  FieldMappingConfig,
  FilterConfig,
  PreviewDataResponse,
  PreviewValidation,
  isValidFieldMapping,
  isValidFilterConfig,
} from "@/lib/acumatica/config-types";

/**
 * Preview data from Acumatica with current configuration
 */
export async function previewAcumaticaData(
  integrationId: string,
  limit: number = 10
): Promise<PreviewDataResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can preview Acumatica data");
  }

  try {
    // Get the integration configuration
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
      include: {
        customerMappings: true,
      },
    });

    if (!integration) {
      throw new Error("Integration not found");
    }

    if (integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    // Validate field mappings and filter config
    const fieldMappings = integration.fieldMappings as FieldMappingConfig | null;
    const filterConfig = integration.filterConfig as FilterConfig | null;

    if (!fieldMappings || !isValidFieldMapping(fieldMappings)) {
      throw new Error("Invalid field mappings configuration");
    }

    if (!filterConfig || !isValidFilterConfig(filterConfig)) {
      throw new Error("Invalid filter configuration");
    }

    // Create authenticated client
    const client = await createAuthenticatedClient(integration);

    try {
      // Build preview query
      const query = AcumaticaQueryBuilder.buildPreviewQuery(
        integration.apiVersion,
        integration.dataSourceType,
        integration.dataSourceEntity,
        fieldMappings,
        filterConfig,
        limit
      );

      console.log("[Preview] Query:", query);

      // Fetch sample data
      // Generic Inquiry and DAC OData endpoints require Basic Auth instead of session cookies
      const useBasicAuth = integration.dataSourceType === "GENERIC_INQUIRY" ||
                          integration.dataSourceType === "DAC_ODATA";

      const response = useBasicAuth
        ? await client.makeBasicAuthRequest("GET", query)
        : await client.makeRequest("GET", query);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch preview data: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const records = data.value || (Array.isArray(data) ? data : [data]);

      console.log(`[Preview] Fetched ${records.length} records`);

      // Extract and validate data
      const extractedRecords = records.map((record: any) => {
        try {
          return FieldExtractor.extractInvoiceData(record, fieldMappings);
        } catch (error) {
          console.error("[Preview] Error extracting record:", error);
          return null;
        }
      }).filter(Boolean);

      // Perform validation
      const validation = await validatePreviewData(
        extractedRecords,
        integration.customerMappings,
        integration.unmappedCustomerAction
      );

      return {
        records: extractedRecords,
        validation,
        query,
      };
    } finally {
      await client.logout();
    }
  } catch (error) {
    console.error("[Preview] Error:", error);
    throw error;
  }
}

/**
 * Validate preview data and identify issues
 */
async function validatePreviewData(
  records: any[],
  customerMappings: any[],
  unmappedAction: string
): Promise<PreviewValidation> {
  const validation: PreviewValidation = {
    totalRecords: records.length,
    readyToImport: 0,
    unmappedSalespeople: [],
    missingRequired: [],
    warnings: [],
    errors: [],
  };

  // Build customer mapping lookup
  const customerMap = new Map<string, boolean>();
  for (const mapping of customerMappings) {
    if (mapping.status !== "IGNORED") {
      customerMap.set(mapping.acumaticaCustomerId, !!mapping.customerId);
    }
  }

  // Track issues
  const unmappedCustomerCounts = new Map<string, number>();
  const missingFieldCounts = new Map<string, number>();

  for (const record of records) {
    let hasIssue = false;

    // Check required fields
    if (!record.amount || record.amount === 0) {
      missingFieldCounts.set("amount", (missingFieldCounts.get("amount") || 0) + 1);
      hasIssue = true;
    }

    if (!record.date) {
      missingFieldCounts.set("date", (missingFieldCounts.get("date") || 0) + 1);
      hasIssue = true;
    }

    if (!record.uniqueId) {
      missingFieldCounts.set("uniqueId", (missingFieldCounts.get("uniqueId") || 0) + 1);
      hasIssue = true;
    }

    if (!record.customerId) {
      missingFieldCounts.set("customerId", (missingFieldCounts.get("customerId") || 0) + 1);
      hasIssue = true;
    } else {
      const isMapped = customerMap.get(record.customerId);

      if (isMapped === false || isMapped === undefined) {
        // Customer exists in Acumatica but not mapped in ARFlow
        unmappedCustomerCounts.set(
          record.customerId,
          (unmappedCustomerCounts.get(record.customerId) || 0) + 1
        );

        if (unmappedAction === "SKIP") {
          hasIssue = true;
        }
      }
    }

    if (!hasIssue) {
      validation.readyToImport++;
    }
  }

  // Populate validation results
  validation.unmappedSalespeople = Array.from(unmappedCustomerCounts.entries()).map(
    ([customerId, count]) => ({
      salespersonId: customerId,
      count,
    })
  );

  validation.missingRequired = Array.from(missingFieldCounts.entries()).map(
    ([field, count]) => ({
      field,
      count,
    })
  );

  // Generate warnings
  if (validation.unmappedSalespeople.length > 0) {
    if (unmappedAction === "SKIP") {
      validation.warnings.push(
        `${validation.totalRecords - validation.readyToImport} records will be skipped due to unmapped customers`
      );
    } else {
      validation.warnings.push(
        `${validation.unmappedSalespeople.reduce((sum, s) => sum + s.count, 0)} records have unmapped customers and will be assigned to default customer`
      );
    }
  }

  if (validation.missingRequired.length > 0) {
    validation.errors.push(
      `Some records are missing required fields: ${validation.missingRequired.map((m) => m.field).join(", ")}`
    );
  }

  return validation;
}

/**
 * Get total record count for the current filter configuration
 */
export async function getAcumaticaRecordCount(integrationId: string): Promise<number> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can access Acumatica data");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error("Integration not found");
    }

    if (integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    const fieldMappings = integration.fieldMappings as FieldMappingConfig | null;
    const filterConfig = integration.filterConfig as FilterConfig | null;

    if (!fieldMappings || !filterConfig) {
      throw new Error("Field mappings and filter configuration must be set first");
    }

    const client = await createAuthenticatedClient(integration);

    try {
      const countQuery = AcumaticaQueryBuilder.buildCountQuery(
        integration.apiVersion,
        integration.dataSourceType,
        integration.dataSourceEntity,
        filterConfig,
        fieldMappings
      );

      // Generic Inquiry and DAC OData endpoints require Basic Auth instead of session cookies
      const useBasicAuth = integration.dataSourceType === "GENERIC_INQUIRY" ||
                          integration.dataSourceType === "DAC_ODATA";

      const response = useBasicAuth
        ? await client.makeBasicAuthRequest("GET", countQuery)
        : await client.makeRequest("GET", countQuery);

      if (!response.ok) {
        throw new Error(`Failed to get record count: ${response.status}`);
      }

      const count = await response.json();

      // The response might be a number or an object with a value
      return typeof count === "number" ? count : parseInt(count.value || count["@odata.count"] || "0");
    } finally {
      await client.logout();
    }
  } catch (error) {
    console.error("[Record Count] Error:", error);
    throw error;
  }
}

/**
 * Validate field mappings and filter configuration
 */
export async function validateIntegrationConfig(integrationId: string): Promise<{
  fieldMappingsValid: boolean;
  filterConfigValid: boolean;
  fieldMappingErrors: string[];
  filterConfigErrors: string[];
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can validate configuration");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  const fieldMappings = integration.fieldMappings as FieldMappingConfig | null;
  const filterConfig = integration.filterConfig as FilterConfig | null;

  const fieldMappingValidation = fieldMappings
    ? AcumaticaQueryBuilder.validateFieldMappings(fieldMappings)
    : { valid: false, errors: ["Field mappings not configured"] };

  const filterConfigValidation = filterConfig
    ? AcumaticaQueryBuilder.validateFilterConfig(filterConfig)
    : { valid: false, errors: ["Filter configuration not configured"] };

  return {
    fieldMappingsValid: fieldMappingValidation.valid,
    filterConfigValid: filterConfigValidation.valid,
    fieldMappingErrors: fieldMappingValidation.errors,
    filterConfigErrors: filterConfigValidation.errors,
  };
}
