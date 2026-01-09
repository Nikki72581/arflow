/**
 * Acumatica Field Extraction Utilities
 *
 * Extracts values from Acumatica records based on dynamic field mappings.
 * Handles nested fields, arrays, and different data types.
 */

import { FieldMappingConfig } from "./config-types";
import { AcumaticaQueryBuilder } from "./query-builder";

export interface ExtractedInvoiceData {
  // Required fields
  amount: number;
  date: Date;
  salespersonId: string | null;
  uniqueId: string;
  customerId: string;
  customerName?: string;

  // Optional fields
  projectId?: string;
  description?: string;
  branch?: string;

  // Custom fields
  customFields?: Record<string, any>;

  // Line-level data (if applicable)
  lines?: ExtractedLineData[];
}

export interface ExtractedLineData {
  lineNumber: number;
  amount: number;
  itemId?: string;
  itemDescription?: string;
  itemClass?: string;
  salespersonId?: string; // For line-level salesperson assignment

  // Custom fields at line level
  customFields?: Record<string, any>;
}

export class FieldExtractor {
  /**
   * Extract invoice data from an Acumatica record using field mappings
   */
  static extractInvoiceData(
    record: any,
    fieldMappings: FieldMappingConfig
  ): ExtractedInvoiceData {
    const data: ExtractedInvoiceData = {
      amount: this.extractAmount(record, fieldMappings),
      date: this.extractDate(record, fieldMappings),
      salespersonId: this.extractSalespersonId(record, fieldMappings),
      uniqueId: this.extractUniqueId(record, fieldMappings),
      customerId: this.extractCustomerId(record, fieldMappings),
    };

    // Optional fields
    const customerName = this.extractCustomerName(record, fieldMappings);
    if (customerName) {
      data.customerName = customerName;
    }

    const projectId = this.extractProjectId(record, fieldMappings);
    if (projectId) {
      data.projectId = projectId;
    }

    const description = this.extractDescription(record, fieldMappings);
    if (description) {
      data.description = description;
    }

    const branch = this.extractBranch(record, fieldMappings);
    if (branch) {
      data.branch = branch;
    }

    // Custom fields
    const customFields = this.extractCustomFields(record, fieldMappings);
    if (customFields && Object.keys(customFields).length > 0) {
      data.customFields = customFields;
    }

    // Line-level data
    if (fieldMappings.importLevel === "LINE_LEVEL") {
      data.lines = this.extractLineData(record, fieldMappings);
    }

    return data;
  }

  /**
   * Extract amount from record
   */
  private static extractAmount(record: any, fieldMappings: FieldMappingConfig): number {
    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.amount.sourceField
    );

    // Handle { value: number } wrapper format from Acumatica
    const numValue = typeof value === "object" && value?.value !== undefined ? value.value : value;

    const amount = parseFloat(numValue);

    if (isNaN(amount)) {
      console.warn(
        `Invalid amount value from field ${fieldMappings.amount.sourceField}:`,
        value
      );
      return 0;
    }

    return amount;
  }

  /**
   * Extract date from record
   */
  private static extractDate(record: any, fieldMappings: FieldMappingConfig): Date {
    const value = AcumaticaQueryBuilder.extractFieldValue(record, fieldMappings.date.sourceField);

    // Handle { value: string } wrapper format
    const dateValue =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value from field ${fieldMappings.date.sourceField}:`, value);
      return new Date();
    }

    return date;
  }

  /**
   * Extract salesperson ID from record
   * Handles different salesperson locations (header, line, detail tab)
   */
  static extractSalespersonId(
    record: any,
    fieldMappings: FieldMappingConfig
  ): string | null {
    console.log('[FieldExtractor] Extracting salesperson from sourceField:', fieldMappings.salesperson.sourceField);

    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.salesperson.sourceField
    );

    console.log('[FieldExtractor] Raw extracted value:', JSON.stringify(value, null, 2));

    // Handle { value: string } wrapper format
    let salespersonId =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    console.log('[FieldExtractor] After unwrapping { value } format:', salespersonId);

    // If it's an array (from detail tab), take the first salesperson
    if (Array.isArray(salespersonId) && salespersonId.length > 0) {
      const firstSalesperson = salespersonId[0];
      console.log('[FieldExtractor] Found array, first element:', JSON.stringify(firstSalesperson, null, 2));
      salespersonId =
        typeof firstSalesperson === "object" && firstSalesperson?.SalespersonID
          ? firstSalesperson.SalespersonID.value || firstSalesperson.SalespersonID
          : firstSalesperson;
      console.log('[FieldExtractor] After extracting from array:', salespersonId);
    }

    // Handle nested object like { SalespersonID: { value: "SP001" } }
    if (typeof salespersonId === "object" && salespersonId?.SalespersonID) {
      console.log('[FieldExtractor] Found nested SalespersonID object:', JSON.stringify(salespersonId, null, 2));
      salespersonId =
        salespersonId.SalespersonID.value || salespersonId.SalespersonID;
      console.log('[FieldExtractor] After extracting from nested object:', salespersonId);
    }

    console.log('[FieldExtractor] FINAL salespersonId:', salespersonId, 'type:', typeof salespersonId);

    return salespersonId || null;
  }

  /**
   * Extract unique ID from record
   */
  private static extractUniqueId(record: any, fieldMappings: FieldMappingConfig): string {
    // Handle composite keys
    if (fieldMappings.uniqueId.compositeFields) {
      const parts = fieldMappings.uniqueId.compositeFields.map((field) => {
        const value = AcumaticaQueryBuilder.extractFieldValue(record, field);
        return typeof value === "object" && value?.value !== undefined ? value.value : value;
      });
      return parts.filter(Boolean).join("-");
    }

    // Single field
    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.uniqueId.sourceField
    );

    const uniqueId =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return uniqueId || "";
  }

  /**
   * Extract customer ID from record
   */
  private static extractCustomerId(record: any, fieldMappings: FieldMappingConfig): string {
    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.customer.idField
    );

    const customerId =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return customerId || "";
  }

  /**
   * Extract customer name from record
   */
  private static extractCustomerName(
    record: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.customer.nameField) {
      return undefined;
    }

    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.customer.nameField
    );

    const customerName =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return customerName || undefined;
  }

  /**
   * Extract project ID from record
   */
  private static extractProjectId(
    record: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.project?.sourceField) {
      return undefined;
    }

    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.project.sourceField
    );

    const projectId =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return projectId || undefined;
  }

  /**
   * Extract description from record
   */
  private static extractDescription(
    record: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.description?.sourceField) {
      return undefined;
    }

    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.description.sourceField
    );

    const description =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return description || undefined;
  }

  /**
   * Extract branch from record
   */
  private static extractBranch(
    record: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.branch?.sourceField) {
      return undefined;
    }

    const value = AcumaticaQueryBuilder.extractFieldValue(
      record,
      fieldMappings.branch.sourceField
    );

    const branch = typeof value === "object" && value?.value !== undefined ? value.value : value;

    return branch || undefined;
  }

  /**
   * Extract custom fields from record
   */
  private static extractCustomFields(
    record: any,
    fieldMappings: FieldMappingConfig
  ): Record<string, any> | undefined {
    if (!fieldMappings.customFields || fieldMappings.customFields.length === 0) {
      return undefined;
    }

    const customFields: Record<string, any> = {};

    for (const customFieldMapping of fieldMappings.customFields) {
      const value = AcumaticaQueryBuilder.extractFieldValue(
        record,
        customFieldMapping.sourceField
      );

      const fieldValue =
        typeof value === "object" && value?.value !== undefined ? value.value : value;

      if (fieldValue !== null && fieldValue !== undefined) {
        customFields[customFieldMapping.targetFieldName] = fieldValue;
      }
    }

    return Object.keys(customFields).length > 0 ? customFields : undefined;
  }

  /**
   * Extract line-level data from record
   */
  private static extractLineData(
    record: any,
    fieldMappings: FieldMappingConfig
  ): ExtractedLineData[] {
    if (!fieldMappings.lineAmount?.sourceField) {
      return [];
    }

    // Extract the Details array (or whatever the nested entity is called)
    const detailsPath = fieldMappings.lineAmount.sourceField.split("/")[0];
    const details = record[detailsPath];

    if (!Array.isArray(details) || details.length === 0) {
      return [];
    }

    return details.map((detail: any, index: number) => {
      const lineData: ExtractedLineData = {
        lineNumber: index + 1,
        amount: this.extractLineAmount(detail, fieldMappings),
      };

      // Extract line-level item data
      if (fieldMappings.lineItem) {
        const itemId = this.extractLineItemId(detail, fieldMappings);
        if (itemId) {
          lineData.itemId = itemId;
        }

        const itemDescription = this.extractLineItemDescription(detail, fieldMappings);
        if (itemDescription) {
          lineData.itemDescription = itemDescription;
        }

        const itemClass = this.extractLineItemClass(detail, fieldMappings);
        if (itemClass) {
          lineData.itemClass = itemClass;
        }
      }

      // Extract line-level salesperson (if applicable)
      if (fieldMappings.salesperson.sourceLevel === "line") {
        const lineSalesperson = this.extractLineSalespersonId(detail, fieldMappings);
        if (lineSalesperson) {
          lineData.salespersonId = lineSalesperson;
        }
      }

      // Extract line-level custom fields
      const lineCustomFields = this.extractLineCustomFields(detail, fieldMappings);
      if (lineCustomFields && Object.keys(lineCustomFields).length > 0) {
        lineData.customFields = lineCustomFields;
      }

      return lineData;
    });
  }

  /**
   * Extract line amount
   */
  private static extractLineAmount(detail: any, fieldMappings: FieldMappingConfig): number {
    if (!fieldMappings.lineAmount?.sourceField) {
      return 0;
    }

    // Get the field name without the Details/ prefix
    const fieldName = fieldMappings.lineAmount.sourceField.split("/").pop()!;
    const value = detail[fieldName];

    const numValue = typeof value === "object" && value?.value !== undefined ? value.value : value;
    const amount = parseFloat(numValue);

    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Extract line item ID
   */
  private static extractLineItemId(
    detail: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.lineItem?.idField) {
      return undefined;
    }

    const fieldName = fieldMappings.lineItem.idField.split("/").pop()!;
    const value = detail[fieldName];

    const itemId = typeof value === "object" && value?.value !== undefined ? value.value : value;

    return itemId || undefined;
  }

  /**
   * Extract line item description
   */
  private static extractLineItemDescription(
    detail: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.lineItem?.descriptionField) {
      return undefined;
    }

    const fieldName = fieldMappings.lineItem.descriptionField.split("/").pop()!;
    const value = detail[fieldName];

    const description =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return description || undefined;
  }

  /**
   * Extract line item class
   */
  private static extractLineItemClass(
    detail: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    if (!fieldMappings.lineItem?.classField) {
      return undefined;
    }

    const fieldName = fieldMappings.lineItem.classField.split("/").pop()!;
    const value = detail[fieldName];

    const itemClass = typeof value === "object" && value?.value !== undefined ? value.value : value;

    return itemClass || undefined;
  }

  /**
   * Extract line-level salesperson ID
   */
  private static extractLineSalespersonId(
    detail: any,
    fieldMappings: FieldMappingConfig
  ): string | undefined {
    const fieldName = fieldMappings.salesperson.sourceField.split("/").pop()!;
    const value = detail[fieldName];

    const salespersonId =
      typeof value === "object" && value?.value !== undefined ? value.value : value;

    return salespersonId || undefined;
  }

  /**
   * Extract line-level custom fields
   */
  private static extractLineCustomFields(
    detail: any,
    fieldMappings: FieldMappingConfig
  ): Record<string, any> | undefined {
    if (!fieldMappings.customFields || fieldMappings.customFields.length === 0) {
      return undefined;
    }

    const customFields: Record<string, any> = {};

    for (const customFieldMapping of fieldMappings.customFields) {
      // Only process custom fields that are at line level (contain Details/ or similar)
      if (customFieldMapping.sourceField.includes("/")) {
        const fieldName = customFieldMapping.sourceField.split("/").pop()!;
        const value = detail[fieldName];

        const fieldValue =
          typeof value === "object" && value?.value !== undefined ? value.value : value;

        if (fieldValue !== null && fieldValue !== undefined) {
          customFields[customFieldMapping.targetFieldName] = fieldValue;
        }
      }
    }

    return Object.keys(customFields).length > 0 ? customFields : undefined;
  }
}
