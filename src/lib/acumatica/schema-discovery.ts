/**
 * Acumatica Schema Discovery Service
 *
 * Dynamically discovers available entities, fields, and data sources
 * from a specific Acumatica instance.
 */

import { AcumaticaClient } from "./client";
import { DataSourceType } from "@prisma/client";
import {
  DiscoveredSchema,
  EntityInfo,
  FieldInfo,
  InquiryInfo,
  AcumaticaFieldType,
} from "./config-types";
import { prisma } from "@/lib/prisma";
import { enrichRecords } from "./data-enrichment";

// ============================================
// Schema Discovery Service
// ============================================

export class SchemaDiscoveryService {
  /**
   * Discover available REST API entities
   */
  static async discoverRestApiEntities(
    client: AcumaticaClient
  ): Promise<EntityInfo[]> {
    // Standard Acumatica entities commonly used for invoice data
    const standardEntities: EntityInfo[] = [
      {
        name: "Invoice",
        endpoint: `/entity/Default/${client.apiVersion}/Invoice`,
        displayName: "AR Invoice & Memos",
        description: "Accounts Receivable invoices and credit/debit memos",
        screenId: "AR301000",
      },
      {
        name: "SalesInvoice",
        endpoint: `/entity/Default/${client.apiVersion}/SalesInvoice`,
        displayName: "Sales Order Invoices",
        description: "Invoices created from Sales Orders",
        screenId: "SO303000",
      },
      {
        name: "SalesOrder",
        endpoint: `/entity/Default/${client.apiVersion}/SalesOrder`,
        displayName: "Sales Orders",
        description: "Sales Order documents",
        screenId: "SO301000",
      },
    ];

    // TODO: In the future, we could dynamically discover all available entities
    // by querying the Acumatica metadata endpoint, but for now we use the standard set

    return standardEntities;
  }

  /**
   * Get the schema for a specific REST API entity
   */
  static async getRestApiEntitySchema(
    client: AcumaticaClient,
    entityName: string
  ): Promise<FieldInfo[]> {
    try {
      // Fetch the ad-hoc schema for the entity
      const schemaUrl = `/entity/Default/${client.apiVersion}/${entityName}/$adHocSchema`;

      const response = await client.makeRequest("GET", schemaUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch schema for ${entityName}: ${response.status} ${response.statusText}`
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
    entityName: string
  ): Promise<FieldInfo[]> {
    const expandedFields: FieldInfo[] = [];

    // Define which sections to expand for each entity
    const expansionMap: Record<string, string[]> = {
      SalesOrder: ['FinancialSettings', 'Commissions', 'Details'],
      SalesInvoice: ['Commissions', 'FinancialDetails', 'BillingSettings'],
      Invoice: ['Details', 'TaxDetails'],
    };

    const sectionsToExpand = expansionMap[entityName];
    if (!sectionsToExpand || sectionsToExpand.length === 0) {
      return expandedFields;
    }

    try {
      // Fetch a sample record with expanded sections
      const expandQuery = `$expand=${sectionsToExpand.join(',')}`;
      const url = `/entity/Default/${client.apiVersion}/${entityName}?$top=1&${expandQuery}`;

      const response = await client.makeRequest('GET', url);
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
        if (!sectionData || typeof sectionData !== 'object') {
          continue;
        }

        // Process section fields
        for (const [fieldName, fieldValue] of Object.entries(sectionData)) {
          // Skip metadata fields
          if (['id', 'rowNumber', 'note', '_links', 'custom'].includes(fieldName)) {
            continue;
          }

          // Create nested field path
          const nestedFieldName = `${section}/${fieldName}`;

          // Extract the actual value if wrapped
          let sampleValue = fieldValue;
          if (fieldValue && typeof fieldValue === 'object' && 'value' in fieldValue) {
            sampleValue = (fieldValue as any).value;
          }

          // Skip empty objects
          if (sampleValue && typeof sampleValue === 'object' && Object.keys(sampleValue).length === 0) {
            sampleValue = null;
          }

          // Infer type from sample value
          const inferredType = sampleValue !== null && sampleValue !== undefined
            ? this.inferTypeFromValue(sampleValue, fieldName)
            : 'string';

          expandedFields.push({
            name: nestedFieldName,
            displayName: `${section} - ${fieldName}`,
            type: inferredType,
            description: `From ${section} section`,
            isRequired: false,
            isCustom: false,
            isNested: true,
            parentEntity: section,
            sampleValue: sampleValue !== undefined && sampleValue !== null ? sampleValue : null,
          });
        }
      }

      console.log(`[Schema Discovery] Added ${expandedFields.length} expanded fields from ${sectionsToExpand.join(', ')} for ${entityName}`);
    } catch (error) {
      console.error(`Error fetching expanded fields for ${entityName}:`, error);
    }

    // Add special enriched fields for SalesInvoice (from related SalesOrder)
    if (entityName === 'SalesInvoice') {
      try {
        const enrichedSampleUrl = `/entity/Default/${client.apiVersion}/SalesInvoice?$top=1`;
        const invoiceResponse = await client.makeRequest('GET', enrichedSampleUrl);

        if (invoiceResponse.ok) {
          const invoices = await invoiceResponse.json();
          if (invoices && invoices.length > 0) {
            const invoice = invoices[0];
            const orderNbr = invoice.CustomerOrder?.value || invoice.OrderNbr?.value;

            if (orderNbr) {
              // Fetch the related sales order
              const soQuery = `/entity/Default/${client.apiVersion}/SalesOrder?$filter=OrderNbr eq '${orderNbr}'&$expand=FinancialSettings,Commissions&$top=1`;
              const soResponse = await client.makeRequest('GET', soQuery);

              if (soResponse.ok) {
                const salesOrders = await soResponse.json();
                if (salesOrders && salesOrders.length > 0) {
                  const so = salesOrders[0];

                  // Add enriched fields
                  if (so.FinancialSettings?.Owner) {
                    expandedFields.push({
                      name: 'SalesOrder_Owner',
                      displayName: 'Sales Order - Owner',
                      type: 'string',
                      description: 'Owner from the related Sales Order',
                      isRequired: false,
                      isCustom: false,
                      isNested: true,
                      parentEntity: 'SalesOrder',
                      sampleValue: so.FinancialSettings.Owner.value || so.FinancialSettings.Owner,
                    });
                  }

                  if (so.Commissions?.DefaultSalesperson) {
                    expandedFields.push({
                      name: 'SalesOrder_DefaultSalesperson',
                      displayName: 'Sales Order - Default Salesperson',
                      type: 'string',
                      description: 'Default Salesperson from the related Sales Order',
                      isRequired: false,
                      isCustom: false,
                      isNested: true,
                      parentEntity: 'SalesOrder',
                      sampleValue: so.Commissions.DefaultSalesperson.value || so.Commissions.DefaultSalesperson,
                    });
                  }

                  console.log('[Schema Discovery] Added enriched SalesOrder fields to SalesInvoice schema');
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[Schema Discovery] Error adding enriched SalesOrder fields:', error);
      }
    }

    return expandedFields;
  }

  /**
   * Parse REST API schema data into FieldInfo array
   */
  private static parseRestApiSchema(
    schemaData: any,
    entityName: string
  ): FieldInfo[] {
    const fields: FieldInfo[] = [];

    // The schema structure varies by Acumatica version, but typically:
    // - schemaData.fields or schemaData.properties contains field definitions
    // - custom fields are prefixed with "custom/"

    const properties = schemaData.fields || schemaData.properties || schemaData;

    // Fields to skip - these are metadata fields, not actual data fields
    const skipFields = new Set(['id', 'rowNumber', 'note', '_links', 'custom']);

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
   * Discover available Generic Inquiries exposed via OData
   */
  static async discoverGenericInquiries(
    client: AcumaticaClient
  ): Promise<InquiryInfo[]> {
    // Generic Inquiries in Acumatica are exposed via the /odata/$metadata endpoint
    // This endpoint requires Basic Authentication instead of session cookies
    const metadataUrl = '/odata/$metadata';

    try {
      console.log(`[Schema Discovery] Discovering Generic Inquiries from: ${metadataUrl}`);
      console.log(`[Schema Discovery] Using Basic Authentication for OData endpoint`);

      const response = await client.makeBasicAuthRequest("GET", metadataUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Schema Discovery] Failed to fetch Generic Inquiry metadata: ${response.status} ${response.statusText}`
        );
        console.error(`[Schema Discovery] Error response: ${errorText.substring(0, 500)}`);
        throw new Error(`Failed to access Generic Inquiry OData endpoint: ${response.status} ${response.statusText}`);
      }

      const metadataXml = await response.text();

      console.log(`[Schema Discovery] Successfully retrieved metadata (${metadataXml.length} characters)`);

      // Parse the OData metadata XML
      const inquiries = this.parseGenericInquiryMetadata(metadataXml, client.apiVersion);

      if (inquiries.length > 0) {
        console.log(`[Schema Discovery] Found ${inquiries.length} Generic Inquiries`);
        console.log(`[Schema Discovery] Inquiry names: ${inquiries.map(i => i.name).join(', ')}`);

        // Update the endpoint for each inquiry
        const updatedInquiries = inquiries.map(inq => ({
          ...inq,
          endpoint: `/odata/${inq.name}`,
        }));

        return updatedInquiries;
      } else {
        console.warn(`[Schema Discovery] No Generic Inquiries found in metadata`);
        console.warn(`[Schema Discovery] This means no Generic Inquiries have been published via OData`);
        console.warn(`[Schema Discovery] Please create a Generic Inquiry in Acumatica (SM208000) and check "Expose via OData"`);
        return [];
      }
    } catch (error) {
      console.error('[Schema Discovery] Error discovering Generic Inquiries:', error);
      console.error(
        '[Schema Discovery] Possible causes:\n' +
        '  1. Generic Inquiry OData is not enabled in Acumatica (SM207045)\n' +
        '  2. No Generic Inquiries have been published via OData (check "Expose via OData" in SM208000)\n' +
        '  3. User lacks permissions to access OData endpoints\n' +
        '  4. Authentication failed (Basic Auth required for OData)'
      );
      throw error;
    }
  }

  /**
   * Get the schema for a specific Generic Inquiry
   */
  static async getGenericInquirySchema(
    client: AcumaticaClient,
    inquiryName: string
  ): Promise<FieldInfo[]> {
    try {
      // Generic Inquiries expose their schema through OData metadata
      // Use Basic Auth for OData endpoints
      const metadataUrl = `/odata/$metadata`;

      console.log(`[Schema Discovery] Fetching schema for Generic Inquiry: ${inquiryName}`);

      const response = await client.makeBasicAuthRequest("GET", metadataUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch Generic Inquiry schema: ${response.status} ${response.statusText}`
        );
      }

      const metadataXml = await response.text();

      console.log(`[Schema Discovery] Parsing schema for ${inquiryName} from metadata`);

      // Parse the metadata for this specific inquiry
      return this.parseGenericInquirySchema(metadataXml, inquiryName);
    } catch (error) {
      console.error(
        `Error fetching Generic Inquiry schema for ${inquiryName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Parse Generic Inquiry OData metadata XML
   */
  private static parseGenericInquiryMetadata(
    metadataXml: string,
    apiVersion: string
  ): InquiryInfo[] {
    const inquiries: InquiryInfo[] = [];

    // Simple XML parsing - look for EntitySet elements
    // In a production system, you'd use a proper XML parser
    const entitySetRegex = /<EntitySet Name="([^"]+)"/g;
    let match;

    while ((match = entitySetRegex.exec(metadataXml)) !== null) {
      const inquiryName = match[1];

      inquiries.push({
        name: inquiryName,
        inquiryName: inquiryName,
        endpoint: `/odata/${inquiryName}`,
        displayName: inquiryName,
        description: `Generic Inquiry: ${inquiryName}`,
        isODataExposed: true,
      });
    }

    return inquiries;
  }

  /**
   * Parse Generic Inquiry schema from OData metadata
   */
  private static parseGenericInquirySchema(
    metadataXml: string,
    inquiryName: string
  ): FieldInfo[] {
    const fields: FieldInfo[] = [];

    // Find the EntityType definition for this inquiry
    const entityTypeRegex = new RegExp(
      `<EntityType Name="${inquiryName}"[\\s\\S]*?</EntityType>`,
      "g"
    );
    const entityTypeMatch = entityTypeRegex.exec(metadataXml);

    if (!entityTypeMatch) {
      return fields;
    }

    const entityTypeDef = entityTypeMatch[0];

    // Parse Property elements
    const propertyRegex = /<Property Name="([^"]+)" Type="([^"]+)"(.*?)\/>/g;
    let match;

    while ((match = propertyRegex.exec(entityTypeDef)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];
      const attributes = match[3];

      fields.push({
        name: fieldName,
        displayName: fieldName,
        type: this.mapODataType(fieldType),
        isRequired: attributes.includes('Nullable="false"'),
        isCustom: false,
        isNested: false,
      });
    }

    return fields;
  }

  /**
   * Discover available DAC entities (advanced)
   */
  static async discoverDacEntities(
    client: AcumaticaClient
  ): Promise<EntityInfo[]> {
    try {
      // Fetch the OData metadata for DAC entities
      const metadataUrl = `/api/odata/dac/$metadata`;

      const response = await client.makeRequest("GET", metadataUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch DAC metadata: ${response.status} ${response.statusText}`
        );
      }

      const metadataXml = await response.text();

      // Parse the OData metadata XML for DAC entities
      return this.parseDacMetadata(metadataXml);
    } catch (error) {
      console.error("Error fetching DAC metadata:", error);
      return [];
    }
  }

  /**
   * Get the schema for a specific DAC entity
   */
  static async getDacEntitySchema(
    client: AcumaticaClient,
    dacName: string
  ): Promise<FieldInfo[]> {
    try {
      const metadataUrl = `/api/odata/dac/$metadata`;

      const response = await client.makeRequest("GET", metadataUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch DAC schema: ${response.status} ${response.statusText}`
        );
      }

      const metadataXml = await response.text();

      // Parse the metadata for this specific DAC
      return this.parseDacSchema(metadataXml, dacName);
    } catch (error) {
      console.error(`Error fetching DAC schema for ${dacName}:`, error);
      throw error;
    }
  }

  /**
   * Parse DAC OData metadata
   */
  private static parseDacMetadata(metadataXml: string): EntityInfo[] {
    const entities: EntityInfo[] = [];

    // Simple XML parsing - look for EntitySet elements
    const entitySetRegex = /<EntitySet Name="([^"]+)"/g;
    let match;

    while ((match = entitySetRegex.exec(metadataXml)) !== null) {
      const dacName = match[1];

      entities.push({
        name: dacName,
        endpoint: `/odatav4/${dacName}`,
        displayName: dacName,
        description: `DAC: ${dacName}`,
      });
    }

    return entities;
  }

  /**
   * Parse DAC schema from OData metadata
   */
  private static parseDacSchema(
    metadataXml: string,
    dacName: string
  ): FieldInfo[] {
    // Similar to Generic Inquiry schema parsing
    return this.parseGenericInquirySchema(metadataXml, dacName);
  }

  /**
   * Get sample data from a data source for preview
   */
  static async getSampleData(
    client: AcumaticaClient,
    dataSource: { type: DataSourceType; entity: string },
    limit: number = 10
  ): Promise<any[]> {
    try {
      let query = "";
      let useBasicAuth = false;

      if (dataSource.type === "REST_API") {
        // Add expand query for entities with nested sections
        const expansionMap: Record<string, string[]> = {
          SalesOrder: ['FinancialSettings', 'Commissions', 'Details'],
          SalesInvoice: ['Commissions', 'FinancialDetails', 'BillingSettings'],
          Invoice: ['Details', 'TaxDetails'],
        };

        const sectionsToExpand = expansionMap[dataSource.entity];
        const expandQuery = sectionsToExpand ? `&$expand=${sectionsToExpand.join(',')}` : '';

        query = `/entity/Default/${client.apiVersion}/${dataSource.entity}?$top=${limit}${expandQuery}`;
        useBasicAuth = false;
      } else if (dataSource.type === "GENERIC_INQUIRY") {
        // Generic Inquiry OData requires Basic Auth
        query = `/odata/${dataSource.entity}?$top=${limit}`;
        useBasicAuth = true;
      } else if (dataSource.type === "DAC_ODATA") {
        query = `/odatav4/${dataSource.entity}?$top=${limit}`;
        useBasicAuth = true;
      }

      const response = useBasicAuth
        ? await client.makeBasicAuthRequest("GET", query)
        : await client.makeRequest("GET", query);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch sample data: ${response.status} ${response.statusText}`
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

      // Enrich records with related data if needed (e.g., SalesInvoice with SalesOrder)
      if (dataSource.type === "REST_API") {
        records = await enrichRecords(client, dataSource.entity, records);
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
    schema: DiscoveredSchema
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
    integrationId: string
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
    entityName: string
  ): Promise<DiscoveredSchema> {
    let fields: FieldInfo[] = [];
    let endpoint = "";

    if (dataSourceType === "REST_API") {
      fields = await this.getRestApiEntitySchema(client, entityName);
      endpoint = `/entity/Default/${client.apiVersion}/${entityName}`;

      // Add nested fields from expandable sections for specific entities
      const expandedFields = await this.getExpandedFields(client, entityName);
      fields = [...fields, ...expandedFields];
    } else if (dataSourceType === "GENERIC_INQUIRY") {
      fields = await this.getGenericInquirySchema(client, entityName);
      endpoint = `/odata/${entityName}`;
    } else if (dataSourceType === "DAC_ODATA") {
      fields = await this.getDacEntitySchema(client, entityName);
      endpoint = `/odatav4/${entityName}`;
    }

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
   * Map OData type to our type system
   */
  private static mapODataType(odataType: string): AcumaticaFieldType {
    // OData types like "Edm.String", "Edm.Decimal", etc.
    const cleanType = odataType.replace("Edm.", "");
    return this.mapAcumaticaType(cleanType);
  }

  /**
   * Infer field type from a sample value
   */
  private static inferTypeFromValue(value: any, fieldName?: string): AcumaticaFieldType {
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
      const monetaryFieldNames = ['amount', 'total', 'balance', 'price', 'cost', 'tax', 'discount', 'payment', 'fee'];
      const isMonetaryField = fieldName && monetaryFieldNames.some(name =>
        fieldName.toLowerCase().includes(name)
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
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
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
    sampleData: any[]
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
      if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
        sampleValue = rawValue.value;
      }

      // Skip empty objects that have no value property
      if (sampleValue && typeof sampleValue === 'object' && Object.keys(sampleValue).length === 0) {
        sampleValue = null;
      }

      // Infer the actual type from the sample value if we only have 'string' type
      let inferredType = field.type;
      if (field.type === 'string' && sampleValue !== null && sampleValue !== undefined) {
        inferredType = this.inferTypeFromValue(sampleValue, field.name);
      }

      return {
        ...field,
        type: inferredType,
        sampleValue: sampleValue !== undefined && sampleValue !== null ? sampleValue : null,
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
