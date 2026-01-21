/**
 * Acumatica Integration v2 Configuration Types
 *
 * These types define the structure of JSON configurations for field mappings,
 * filters, and discovered schemas in the dynamic Acumatica integration.
 */

import { DataSourceType } from "@prisma/client";

// ============================================
// Document Type Selection
// ============================================

/**
 * Which document types to collect payments on
 */
export type DocumentTypeSelection = "SALES_ORDERS" | "SALES_INVOICES" | "BOTH";

// ============================================
// Field Mapping Configuration
// ============================================

/**
 * Field type information from Acumatica
 */
export type AcumaticaFieldType =
  | "string"
  | "decimal"
  | "int"
  | "date"
  | "datetime"
  | "boolean"
  | "guid";

/**
 * Complete field mapping configuration
 * Stored in AcumaticaIntegration.fieldMappings
 */
export interface FieldMappingConfig {
  // Required mappings
  amount: {
    sourceField: string; // e.g., "Amount", "OrderTotal", or "custom/UsrNetAmount"
    sourceType: AcumaticaFieldType;
  };

  balance: {
    sourceField: string; // e.g., "Balance" or "UnpaidBalance"
    sourceType: AcumaticaFieldType;
  };

  date: {
    sourceField: string; // e.g., "Date" or "DocDate"
    sourceType: "date" | "datetime";
  };

  uniqueId: {
    sourceField: string; // e.g., "ReferenceNbr" or "OrderNbr"
    compositeFields?: string[]; // e.g., ["Type", "ReferenceNbr"] for composite key
  };

  customer: {
    idField: string; // e.g., "CustomerID" or "Customer/AcctCD"
    nameField?: string; // e.g., "Customer/CustomerName"
  };

  // Optional mappings
  project?: {
    sourceField: string; // e.g., "Project" or "ProjectID"
  };

  description?: {
    sourceField: string; // e.g., "Description" or "DocDesc"
  };

  branch?: {
    sourceField: string; // e.g., "BranchID"
  };

  // Line-level specific mappings (for line-level imports)
  lineAmount?: {
    sourceField: string; // e.g., "Details/ExtPrice" or "Details/Amount"
    sourceType: AcumaticaFieldType;
  };

  lineItem?: {
    idField: string; // e.g., "Details/InventoryID"
    descriptionField?: string; // e.g., "Details/TranDesc"
    classField?: string; // e.g., "Details/ItemClass"
  };

  // Custom field mappings
  customFields?: Array<{
    sourceField: string; // e.g., "custom/UsrSalesRegion"
    targetFieldName: string; // What to store it as in customFieldValues, e.g., "sales_region"
    sourceType?: AcumaticaFieldType;
  }>;

  // Import level
  importLevel: "INVOICE_TOTAL" | "LINE_LEVEL";
}

// ============================================
// Filter Configuration
// ============================================

/**
 * Filter operator types
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "lt"
  | "ge"
  | "le"
  | "in"
  | "contains";

/**
 * Complete filter configuration
 * Stored in AcumaticaIntegration.filterConfig
 */
export interface FilterConfig {
  // Status filter (required)
  status: {
    field: string; // e.g., "Status"
    allowedValues: string[]; // e.g., ["Open", "Closed"]
  };

  // Document type filter
  documentType?: {
    field: string; // e.g., "Type"
    allowedValues: string[]; // e.g., ["Invoice", "Credit Memo"]
  };

  // Date range filter (required)
  dateRange: {
    field: string; // e.g., "Date"
    startDate: string; // ISO date string
    endDate?: string; // ISO date string, null = ongoing
  };

  // Balance filter - only show documents with open balance
  balanceFilter?: {
    field: string; // e.g., "Balance" or "UnpaidBalance"
    operator: "gt" | "ge"; // greater than or greater than/equal
    value: number; // typically 0 to filter for open balances
  };

  // Branch filter
  branch?: {
    field: string; // e.g., "BranchID"
    mode: "ALL" | "SELECTED";
    selectedValues?: string[]; // Branch IDs if mode is SELECTED
  };

  // Line-level filters (for line-level imports)
  lineFilters?: {
    mode: "ALL" | "ITEM_CLASS" | "GL_ACCOUNT";
    field?: string; // e.g., "Details/ItemClass" or "Details/AccountID"
    allowedValues?: string[]; // Item classes or GL accounts
  };

  // Custom filters
  customFilters?: Array<{
    field: string; // Field path in Acumatica data
    operator: FilterOperator;
    value: string | string[] | number | boolean;
  }>;
}

// ============================================
// Schema Discovery Types
// ============================================

/**
 * Information about a single field in the schema
 */
export interface FieldInfo {
  name: string; // Field name/path (e.g., "Amount", "custom/UsrRegion", "Details/LineNbr")
  displayName?: string; // Human-readable name
  type: AcumaticaFieldType;
  description?: string;
  sampleValue?: any; // Sample value from preview data
  isRequired?: boolean;
  isCustom?: boolean; // True if this is a custom field
  isNested?: boolean; // True if this is from an expanded entity
  parentEntity?: string; // Parent entity name if nested (e.g., "Details", "Commissions")
}

/**
 * Information about an available entity/inquiry
 */
export interface EntityInfo {
  name: string; // Entity name (e.g., "Invoice", "SalesOrder")
  endpoint: string; // Full endpoint path
  displayName?: string;
  description?: string;
  screenId?: string; // Acumatica screen ID (e.g., "AR301000")
}

/**
 * Information about a Generic Inquiry
 */
export interface InquiryInfo extends EntityInfo {
  inquiryName: string; // GI name in Acumatica
  isODataExposed: boolean;
}

/**
 * Complete discovered schema for a data source
 * Stored in AcumaticaIntegration.discoveredSchema
 */
export interface DiscoveredSchema {
  dataSourceType: DataSourceType;
  entity: string; // Entity or inquiry name
  endpoint: string; // Full endpoint URL
  fields: FieldInfo[];
  discoveredAt: string; // ISO timestamp
  apiVersion: string; // Acumatica API version

  // Metadata
  totalFields: number;
  customFieldCount: number;
  nestedEntities?: string[]; // List of expandable nested entities
}

// ============================================
// Data Preview Types
// ============================================

/**
 * Preview data validation result
 */
export interface PreviewValidation {
  totalRecords: number;
  readyToImport: number;

  // Issues
  unmappedCustomers: Array<{
    customerId: string;
    customerName?: string;
    count: number;
  }>;

  missingRequired: Array<{
    field: string;
    count: number;
  }>;

  warnings: string[];
  errors: string[];
}

/**
 * Preview data response
 */
export interface PreviewDataResponse {
  records: any[]; // Sample records from Acumatica
  validation: PreviewValidation;
  query: string; // The OData query used
}

// ============================================
// Helper Types
// ============================================

/**
 * Field mapping suggestion
 */
export interface FieldSuggestion {
  sourceField: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Auto-suggest result for field mappings
 */
export interface AutoSuggestResult {
  amount?: FieldSuggestion;
  balance?: FieldSuggestion;
  date?: FieldSuggestion;
  uniqueId?: FieldSuggestion;
  customer?: FieldSuggestion;
  project?: FieldSuggestion;
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a field mapping config is valid
 */
export function isValidFieldMapping(config: any): config is FieldMappingConfig {
  return (
    config &&
    typeof config === "object" &&
    config.amount?.sourceField &&
    config.balance?.sourceField &&
    config.date?.sourceField &&
    config.uniqueId?.sourceField &&
    config.customer?.idField &&
    ["INVOICE_TOTAL", "LINE_LEVEL"].includes(config.importLevel)
  );
}

/**
 * Check if a filter config is valid
 */
export function isValidFilterConfig(config: any): config is FilterConfig {
  return (
    config &&
    typeof config === "object" &&
    config.status?.field &&
    Array.isArray(config.status?.allowedValues) &&
    config.dateRange?.field &&
    config.dateRange?.startDate
  );
}

/**
 * Check if a discovered schema is valid
 */
export function isValidDiscoveredSchema(
  schema: any,
): schema is DiscoveredSchema {
  return (
    schema &&
    typeof schema === "object" &&
    schema.dataSourceType &&
    schema.entity &&
    schema.endpoint &&
    Array.isArray(schema.fields) &&
    schema.discoveredAt &&
    schema.apiVersion
  );
}
