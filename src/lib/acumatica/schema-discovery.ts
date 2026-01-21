/**
 * Acumatica Schema Discovery Service
 *
 * Simplified schema discovery for REST API entities only.
 * Provides default field mappings for SalesOrder and SalesInvoice endpoints.
 */

import { AcumaticaClient } from "./client";
import { DataSourceType } from "@prisma/client";
import {
  DiscoveredSchema,
  EntityInfo,
  FieldInfo,
  AcumaticaFieldType,
  FieldMappingConfig,
  FilterConfig,
  DocumentTypeSelection,
} from "./config-types";
import { prisma } from "@/lib/prisma";

// ============================================
// Schema Discovery Service
// ============================================

export class SchemaDiscoveryService {
  /**
   * Discover available REST API entities for payment collection
   */
  static async discoverRestApiEntities(
    client: AcumaticaClient,
  ): Promise<EntityInfo[]> {
    const standardEntities: EntityInfo[] = [
      {
        name: "SalesInvoice",
        endpoint: `/entity/Default/${client.apiVersion}/SalesInvoice`,
        displayName: "Sales Invoices",
        description: "Invoices created from Sales Orders with balance tracking",
        screenId: "SO303000",
      },
      {
        name: "SalesOrder",
        endpoint: `/entity/Default/${client.apiVersion}/SalesOrder`,
        displayName: "Sales Orders",
        description: "Sales Order documents with unpaid balance",
        screenId: "SO301000",
      },
    ];

    return standardEntities;
  }

  /**
   * Get default field mappings for a document type selection
   */
  static getDefaultFieldMappings(
    documentTypeSelection: DocumentTypeSelection,
    entityName: "SalesOrder" | "SalesInvoice",
  ): FieldMappingConfig {
    if (entityName === "SalesOrder") {
      return {
        importLevel: "INVOICE_TOTAL",
        amount: {
          sourceField: "OrderTotal",
          sourceType: "decimal",
        },
        balance: {
          sourceField: "UnpaidBalance",
          sourceType: "decimal",
        },
        date: {
          sourceField: "Date",
          sourceType: "date",
        },
        uniqueId: {
          sourceField: "OrderNbr",
        },
        customer: {
          idField: "CustomerID",
        },
        description: {
          sourceField: "Description",
        },
      };
    }

    // SalesInvoice
    return {
      importLevel: "INVOICE_TOTAL",
      amount: {
        sourceField: "Amount",
        sourceType: "decimal",
      },
      balance: {
        sourceField: "Balance",
        sourceType: "decimal",
      },
      date: {
        sourceField: "Date",
        sourceType: "date",
      },
      uniqueId: {
        sourceField: "ReferenceNbr",
      },
      customer: {
        idField: "CustomerID",
      },
      description: {
        sourceField: "Description",
      },
    };
  }

  /**
   * Get entities to use based on document type selection
   */
  static getEntitiesForDocumentType(
    documentTypeSelection: DocumentTypeSelection,
  ): Array<"SalesOrder" | "SalesInvoice"> {
    switch (documentTypeSelection) {
      case "SALES_ORDERS":
        return ["SalesOrder"];
      case "SALES_INVOICES":
        return ["SalesInvoice"];
      case "BOTH":
        return ["SalesOrder", "SalesInvoice"];
    }
  }

  /**
   * Get default filter config for a document type
   */
  static getDefaultFilterConfig(
    entityName: "SalesOrder" | "SalesInvoice",
  ): FilterConfig {
    // Calculate date range - default to last 3 years for broader initial preview
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);

    if (entityName === "SalesOrder") {
      return {
        status: {
          field: "Status",
          // Include common open statuses for Sales Orders
          allowedValues: ["Open", "Hold", "Credit Hold", "Pending Approval"],
        },
        dateRange: {
          field: "Date",
          startDate: startDate.toISOString().split("T")[0],
        },
        // Only show orders with an open balance
        balanceFilter: {
          field: "UnpaidBalance",
          operator: "gt",
          value: 0,
        },
      };
    }

    // SalesInvoice - include more status values for broader matching
    // Acumatica statuses: Open (released with balance), Closed (paid), Balanced, On Hold
    return {
      status: {
        field: "Status",
        allowedValues: ["Open", "Balanced", "Closed", "On Hold"],
      },
      dateRange: {
        field: "Date",
        startDate: startDate.toISOString().split("T")[0],
      },
      // Only show invoices with an open balance
      balanceFilter: {
        field: "Balance",
        operator: "gt",
        value: 0,
      },
    };
  }

  /**
   * Get the schema for a specific REST API entity
   */
  static async getRestApiEntitySchema(
    client: AcumaticaClient,
    entityName: string,
  ): Promise<FieldInfo[]> {
    try {
      // Fetch the ad-hoc schema for the entity
      const schemaUrl = `/entity/Default/${client.apiVersion}/${entityName}/$adHocSchema`;

      const response = await client.makeRequest("GET", schemaUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch schema for ${entityName}: ${response.status} ${response.statusText}`,
        );
      }

      const schemaData = await response.json();

      // Parse the schema and extract field information
      return this.parseRestApiSchema(schemaData, entityName);
    } catch (error) {
      console.error(`Error fetching REST API schema for ${entityName}:`, error);
      throw error;
    }
  }

  /**
   * Get expanded fields from nested sections for specific entities
   */
  static async getExpandedFields(
    client: AcumaticaClient,
    entityName: string,
  ): Promise<FieldInfo[]> {
    const expandedFields: FieldInfo[] = [];

    // Define which sections to expand for each entity (removed Commissions)
    const expansionMap: Record<string, string[]> = {
      SalesOrder: ["FinancialSettings", "Details"],
      SalesInvoice: ["FinancialDetails", "BillingSettings"],
      Invoice: ["Details", "TaxDetails"],
    };

    const sectionsToExpand = expansionMap[entityName];
    if (!sectionsToExpand || sectionsToExpand.length === 0) {
      return expandedFields;
    }

    try {
      // Fetch a sample record with expanded sections
      const expandQuery = `$expand=${sectionsToExpand.join(",")}`;
      const url = `/entity/Default/${client.apiVersion}/${entityName}?$top=1&${expandQuery}`;

      const response = await client.makeRequest("GET", url);
      if (!response.ok) {
        console.warn(`Failed to fetch expanded fields for ${entityName}`);
        return expandedFields;
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return expandedFields;
      }

      const sampleRecord = data[0];

      // Extract fields from expanded sections
      for (const section of sectionsToExpand) {
        const sectionData = sampleRecord[section];
        if (!sectionData || typeof sectionData !== "object") {
          continue;
        }

        // Process section fields
        for (const [fieldName, fieldValue] of Object.entries(sectionData)) {
          // Skip metadata fields
          if (
            ["id", "rowNumber", "note", "_links", "custom"].includes(fieldName)
          ) {
            continue;
          }

          // Create nested field path
          const nestedFieldName = `${section}/${fieldName}`;

          // Extract the actual value if wrapped
          let sampleValue = fieldValue;
          if (
            fieldValue &&
            typeof fieldValue === "object" &&
            "value" in fieldValue
          ) {
            sampleValue = (fieldValue as any).value;
          }

          // Skip empty objects
          if (
            sampleValue &&
            typeof sampleValue === "object" &&
            Object.keys(sampleValue).length === 0
          ) {
            sampleValue = null;
          }

          // Infer type from sample value
          const inferredType =
            sampleValue !== null && sampleValue !== undefined
              ? this.inferTypeFromValue(sampleValue, fieldName)
              : "string";

          expandedFields.push({
            name: nestedFieldName,
            displayName: `${section} - ${fieldName}`,
            type: inferredType,
            description: `From ${section} section`,
            isRequired: false,
            isCustom: false,
            isNested: true,
            parentEntity: section,
            sampleValue:
              sampleValue !== undefined && sampleValue !== null
                ? sampleValue
                : null,
          });
        }
      }

      console.log(
        `[Schema Discovery] Added ${expandedFields.length} expanded fields from ${sectionsToExpand.join(", ")} for ${entityName}`,
      );
    } catch (error) {
      console.error(`Error fetching expanded fields for ${entityName}:`, error);
    }

    return expandedFields;
  }

  /**
   * Parse REST API schema data into FieldInfo array
   */
  private static parseRestApiSchema(
    schemaData: any,
    entityName: string,
  ): FieldInfo[] {
    const fields: FieldInfo[] = [];

    const properties = schemaData.fields || schemaData.properties || schemaData;

    // Fields to skip - these are metadata fields, not actual data fields
    const skipFields = new Set(["id", "rowNumber", "note", "_links", "custom"]);

    for (const [fieldName, fieldDef] of Object.entries(properties)) {
      const def = fieldDef as any;

      // Skip null or undefined field definitions
      if (def === null || def === undefined) {
        continue;
      }

      // Skip metadata fields
      if (skipFields.has(fieldName)) {
        continue;
      }

      fields.push({
        name: fieldName,
        displayName: def.displayName || fieldName,
        type: this.mapAcumaticaType(def.type),
        description: def.description,
        isRequired: def.required === true,
        isCustom: fieldName.startsWith("custom/"),
        isNested: fieldName.includes("/"),
        parentEntity: this.getParentEntity(fieldName),
      });
    }

    return fields;
  }

  /**
   * Get sample data from a data source for preview
   */
  static async getSampleData(
    client: AcumaticaClient,
    dataSource: { type: DataSourceType; entity: string },
    limit: number = 10,
  ): Promise<any[]> {
    try {
      // Define which sections to expand (removed Commissions)
      const expansionMap: Record<string, string[]> = {
        SalesOrder: ["FinancialSettings", "Details"],
        SalesInvoice: ["FinancialDetails", "BillingSettings"],
        Invoice: ["Details", "TaxDetails"],
      };

      const sectionsToExpand = expansionMap[dataSource.entity];
      const expandQuery = sectionsToExpand
        ? `&$expand=${sectionsToExpand.join(",")}`
        : "";

      const query = `/entity/Default/${client.apiVersion}/${dataSource.entity}?$top=${limit}${expandQuery}`;

      const response = await client.makeRequest("GET", query);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch sample data: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Handle different response formats
      let records: any[] = [];
      if (data.value) {
        records = data.value;
      } else if (Array.isArray(data)) {
        records = data;
      } else {
        records = [data];
      }

      return records;
    } catch (error) {
      console.error("Error fetching sample data:", error);
      throw error;
    }
  }

  /**
   * Cache discovered schema in database
   */
  static async cacheSchema(
    integrationId: string,
    schema: DiscoveredSchema,
  ): Promise<void> {
    await prisma.acumaticaIntegration.update({
      where: { id: integrationId },
      data: {
        discoveredSchema: schema as any,
        schemaLastUpdated: new Date(),
      },
    });
  }

  /**
   * Get cached schema from database
   */
  static async getCachedSchema(
    integrationId: string,
  ): Promise<DiscoveredSchema | null> {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
      select: {
        discoveredSchema: true,
        schemaLastUpdated: true,
      },
    });

    if (!integration?.discoveredSchema) {
      return null;
    }

    return integration.discoveredSchema as unknown as DiscoveredSchema;
  }

  /**
   * Build a complete discovered schema from an entity
   */
  static async buildDiscoveredSchema(
    client: AcumaticaClient,
    dataSourceType: DataSourceType,
    entityName: string,
  ): Promise<DiscoveredSchema> {
    let fields: FieldInfo[] = [];
    const endpoint = `/entity/Default/${client.apiVersion}/${entityName}`;

    fields = await this.getRestApiEntitySchema(client, entityName);

    // Add nested fields from expandable sections
    const expandedFields = await this.getExpandedFields(client, entityName);
    fields = [...fields, ...expandedFields];

    const customFieldCount = fields.filter((f) => f.isCustom).length;
    const nestedEntities = [
      ...new Set(fields.filter((f) => f.isNested).map((f) => f.parentEntity!)),
    ];

    return {
      dataSourceType,
      entity: entityName,
      endpoint,
      fields,
      discoveredAt: new Date().toISOString(),
      apiVersion: client.apiVersion,
      totalFields: fields.length,
      customFieldCount,
      nestedEntities,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Map Acumatica type to our type system
   */
  private static mapAcumaticaType(acumaticaType: string): AcumaticaFieldType {
    const typeMap: Record<string, AcumaticaFieldType> = {
      string: "string",
      String: "string",
      decimal: "decimal",
      Decimal: "decimal",
      int: "int",
      Int32: "int",
      Integer: "int",
      date: "date",
      Date: "date",
      datetime: "datetime",
      DateTime: "datetime",
      boolean: "boolean",
      Boolean: "boolean",
      guid: "guid",
      Guid: "guid",
    };

    return typeMap[acumaticaType] || "string";
  }

  /**
   * Infer field type from a sample value
   */
  private static inferTypeFromValue(
    value: any,
    fieldName?: string,
  ): AcumaticaFieldType {
    if (value === null || value === undefined) {
      return "string";
    }

    // Check for boolean
    if (typeof value === "boolean") {
      return "boolean";
    }

    // Check for number types
    if (typeof value === "number") {
      // Financial/monetary fields should always be treated as decimal
      const monetaryFieldNames = [
        "amount",
        "total",
        "balance",
        "price",
        "cost",
        "tax",
        "discount",
        "payment",
        "fee",
      ];
      const isMonetaryField =
        fieldName &&
        monetaryFieldNames.some((name) =>
          fieldName.toLowerCase().includes(name),
        );

      if (isMonetaryField) {
        return "decimal";
      }

      // Otherwise check if it's an integer or decimal
      return Number.isInteger(value) ? "int" : "decimal";
    }

    // Check for date/datetime strings
    if (typeof value === "string") {
      // ISO 8601 datetime format: 2021-01-27T15:45:09.593+00:00
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return "datetime";
      }
      // Date-only format: 2021-01-27
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return "date";
      }
      // GUID format
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        )
      ) {
        return "guid";
      }
    }

    return "string";
  }

  /**
   * Extract parent entity from nested field path
   */
  private static getParentEntity(fieldPath: string): string | undefined {
    if (!fieldPath.includes("/")) {
      return undefined;
    }

    const parts = fieldPath.split("/");
    return parts[0];
  }

  /**
   * Enrich fields with sample data
   */
  static enrichFieldsWithSamples(
    fields: FieldInfo[],
    sampleData: any[],
  ): FieldInfo[] {
    if (sampleData.length === 0) {
      return fields;
    }

    const firstRecord = sampleData[0];

    return fields.map((field) => {
      // Get sample value from first record
      const rawValue = this.getNestedValue(firstRecord, field.name);

      // Acumatica REST API returns values in format: { value: actualValue }
      // Extract the actual value from this wrapper
      let sampleValue = rawValue;
      if (rawValue && typeof rawValue === "object" && "value" in rawValue) {
        sampleValue = rawValue.value;
      }

      // Skip empty objects that have no value property
      if (
        sampleValue &&
        typeof sampleValue === "object" &&
        Object.keys(sampleValue).length === 0
      ) {
        sampleValue = null;
      }

      // Infer the actual type from the sample value if we only have 'string' type
      let inferredType = field.type;
      if (
        field.type === "string" &&
        sampleValue !== null &&
        sampleValue !== undefined
      ) {
        inferredType = this.inferTypeFromValue(sampleValue, field.name);
      }

      return {
        ...field,
        type: inferredType,
        sampleValue:
          sampleValue !== undefined && sampleValue !== null
            ? sampleValue
            : null,
      };
    });
  }

  /**
   * Get nested value from object using path like "Details/Amount"
   */
  private static getNestedValue(obj: any, path: string): any {
    const parts = path.split("/");
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }
}
