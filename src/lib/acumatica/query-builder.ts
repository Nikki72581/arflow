/**
 * Acumatica Dynamic Query Builder
 *
 * Builds OData queries dynamically based on field mappings and filter configurations.
 * Supports REST API, Generic Inquiry, and DAC OData endpoints.
 */

import { DataSourceType } from "@prisma/client";
import { FieldMappingConfig, FilterConfig } from "./config-types";

export class AcumaticaQueryBuilder {
  /**
   * Build a complete OData query for fetching invoices
   */
  static buildQuery(
    apiVersion: string,
    dataSourceType: DataSourceType,
    dataSourceEntity: string,
    fieldMappings: FieldMappingConfig,
    filterConfig: FilterConfig,
  ): string {
    let baseEndpoint = "";

    // Determine base endpoint based on data source type
    if (dataSourceType === "REST_API") {
      baseEndpoint = `/entity/Default/${apiVersion}/${dataSourceEntity}`;
    } else if (dataSourceType === "GENERIC_INQUIRY") {
      baseEndpoint = `/odata/${dataSourceEntity}`;
    } else if (dataSourceType === "DAC_ODATA") {
      baseEndpoint = `/odatav4/${dataSourceEntity}`;
    }

    // Build query components
    const selectClause = this.buildSelectClause(fieldMappings);
    const filterClause = this.buildFilterClause(filterConfig, fieldMappings);
    const expandClause = this.buildExpandClause(fieldMappings);

    // Combine into full query
    const queryParts: string[] = [];

    if (selectClause) {
      queryParts.push(`$select=${selectClause}`);
    }

    if (expandClause) {
      queryParts.push(`$expand=${expandClause}`);
    }

    if (filterClause) {
      queryParts.push(`$filter=${encodeURIComponent(filterClause)}`);
    }

    const queryString = queryParts.join("&");
    return `${baseEndpoint}${queryString ? "?" + queryString : ""}`;
  }

  /**
   * Build $select clause from field mappings
   * Only fetch the fields we need
   */
  static buildSelectClause(fieldMappings: FieldMappingConfig): string {
    const fields: string[] = [];

    // Add required fields
    fields.push(this.getFieldName(fieldMappings.amount.sourceField));
    fields.push(this.getFieldName(fieldMappings.date.sourceField));
    fields.push(this.getFieldName(fieldMappings.balance.sourceField));
    fields.push(this.getFieldName(fieldMappings.uniqueId.sourceField));
    fields.push(this.getFieldName(fieldMappings.customer.idField));

    if (fieldMappings.customer.nameField) {
      fields.push(this.getFieldName(fieldMappings.customer.nameField));
    }

    // Add optional fields
    if (fieldMappings.project?.sourceField) {
      fields.push(this.getFieldName(fieldMappings.project.sourceField));
    }

    if (fieldMappings.description?.sourceField) {
      fields.push(this.getFieldName(fieldMappings.description.sourceField));
    }

    if (fieldMappings.branch?.sourceField) {
      fields.push(this.getFieldName(fieldMappings.branch.sourceField));
    }

    // Add line-level fields if applicable
    if (fieldMappings.importLevel === "LINE_LEVEL") {
      if (fieldMappings.lineAmount?.sourceField) {
        fields.push(this.getFieldName(fieldMappings.lineAmount.sourceField));
      }

      if (fieldMappings.lineItem) {
        fields.push(this.getFieldName(fieldMappings.lineItem.idField));
        if (fieldMappings.lineItem.descriptionField) {
          fields.push(
            this.getFieldName(fieldMappings.lineItem.descriptionField),
          );
        }
        if (fieldMappings.lineItem.classField) {
          fields.push(this.getFieldName(fieldMappings.lineItem.classField));
        }
      }
    }

    // Add custom fields
    if (fieldMappings.customFields) {
      for (const customField of fieldMappings.customFields) {
        fields.push(this.getFieldName(customField.sourceField));
      }
    }

    // Remove duplicates and nested field prefixes (they'll be in $expand)
    const uniqueFields = [...new Set(fields.filter((f) => !f.includes("/")))];

    return uniqueFields.join(",");
  }

  /**
   * Build $expand clause for nested entities
   */
  static buildExpandClause(fieldMappings: FieldMappingConfig): string {
    const expandedEntities = new Set<string>();

    // Helper to extract entity name from field path
    const addExpand = (fieldPath: string) => {
      if (fieldPath.includes("/")) {
        const parts = fieldPath.split("/");
        expandedEntities.add(parts[0]);
      }
    };

    // Check all field mappings for nested fields
    addExpand(fieldMappings.amount.sourceField);
    addExpand(fieldMappings.date.sourceField);
    addExpand(fieldMappings.balance.sourceField);
    addExpand(fieldMappings.uniqueId.sourceField);
    addExpand(fieldMappings.customer.idField);

    if (fieldMappings.customer.nameField) {
      addExpand(fieldMappings.customer.nameField);
    }

    if (fieldMappings.project?.sourceField) {
      addExpand(fieldMappings.project.sourceField);
    }

    if (fieldMappings.description?.sourceField) {
      addExpand(fieldMappings.description.sourceField);
    }

    if (fieldMappings.branch?.sourceField) {
      addExpand(fieldMappings.branch.sourceField);
    }

    // Line-level fields
    if (fieldMappings.importLevel === "LINE_LEVEL") {
      if (fieldMappings.lineAmount?.sourceField) {
        addExpand(fieldMappings.lineAmount.sourceField);
      }

      if (fieldMappings.lineItem) {
        addExpand(fieldMappings.lineItem.idField);
        if (fieldMappings.lineItem.descriptionField) {
          addExpand(fieldMappings.lineItem.descriptionField);
        }
        if (fieldMappings.lineItem.classField) {
          addExpand(fieldMappings.lineItem.classField);
        }
      }
    }

    // Custom fields
    if (fieldMappings.customFields) {
      for (const customField of fieldMappings.customFields) {
        addExpand(customField.sourceField);
      }
    }

    if (expandedEntities.size === 0) {
      return "";
    }

    return Array.from(expandedEntities).join(",");
  }

  /**
   * Build $filter clause from filter configuration
   */
  static buildFilterClause(
    filterConfig: FilterConfig,
    fieldMappings: FieldMappingConfig,
  ): string {
    const filters: string[] = [];

    // Status filter (required)
    if (filterConfig.status.allowedValues.length > 0) {
      const statusFilters = filterConfig.status.allowedValues
        .map((status) => `${filterConfig.status.field} eq '${status}'`)
        .join(" or ");

      filters.push(`(${statusFilters})`);
    }

    // Document type filter
    if (
      filterConfig.documentType &&
      filterConfig.documentType.allowedValues.length > 0
    ) {
      const typeFilters = filterConfig.documentType.allowedValues
        .map((type) => `${filterConfig.documentType!.field} eq '${type}'`)
        .join(" or ");

      filters.push(`(${typeFilters})`);
    }

    // Date range filter (required)
    // Use datetimeoffset format for Acumatica REST API compatibility
    const dateField = filterConfig.dateRange.field;
    const startDateWithTime = filterConfig.dateRange.startDate.includes("T")
      ? filterConfig.dateRange.startDate
      : `${filterConfig.dateRange.startDate}T00:00:00Z`;
    filters.push(`${dateField} ge datetimeoffset'${startDateWithTime}'`);

    if (filterConfig.dateRange.endDate) {
      const endDateWithTime = filterConfig.dateRange.endDate.includes("T")
        ? filterConfig.dateRange.endDate
        : `${filterConfig.dateRange.endDate}T23:59:59Z`;
      filters.push(`${dateField} le datetimeoffset'${endDateWithTime}'`);
    }

    // Balance filter - only show documents with open balance
    if (filterConfig.balanceFilter) {
      const balanceField = filterConfig.balanceFilter.field;
      const balanceOperator = filterConfig.balanceFilter.operator;
      const balanceValue = filterConfig.balanceFilter.value;
      filters.push(`${balanceField} ${balanceOperator} ${balanceValue}`);
    }

    // Branch filter
    if (
      filterConfig.branch?.mode === "SELECTED" &&
      filterConfig.branch.selectedValues?.length
    ) {
      const branchFilters = filterConfig.branch.selectedValues
        .map((branch) => `${filterConfig.branch!.field} eq '${branch}'`)
        .join(" or ");

      filters.push(`(${branchFilters})`);
    }

    // Line-level filters (only for line-level imports)
    if (
      fieldMappings.importLevel === "LINE_LEVEL" &&
      filterConfig.lineFilters?.mode !== "ALL" &&
      filterConfig.lineFilters?.allowedValues?.length
    ) {
      const lineField = filterConfig.lineFilters.field!;
      const lineFilters = filterConfig.lineFilters.allowedValues
        .map((value) => `${lineField} eq '${value}'`)
        .join(" or ");

      filters.push(`(${lineFilters})`);
    }

    // Custom filters
    if (filterConfig.customFilters) {
      for (const customFilter of filterConfig.customFilters) {
        const filterStr = this.buildCustomFilter(customFilter);
        if (filterStr) {
          filters.push(filterStr);
        }
      }
    }

    return filters.join(" and ");
  }

  /**
   * Build a custom filter clause
   */
  private static buildCustomFilter(filter: {
    field: string;
    operator: string;
    value: string | string[] | number | boolean;
  }): string {
    const { field, operator, value } = filter;

    // Handle different operators
    switch (operator) {
      case "eq":
        return `${field} eq '${value}'`;

      case "ne":
        return `${field} ne '${value}'`;

      case "gt":
        return `${field} gt ${typeof value === "string" ? `'${value}'` : value}`;

      case "lt":
        return `${field} lt ${typeof value === "string" ? `'${value}'` : value}`;

      case "ge":
        return `${field} ge ${typeof value === "string" ? `'${value}'` : value}`;

      case "le":
        return `${field} le ${typeof value === "string" ? `'${value}'` : value}`;

      case "in":
        if (Array.isArray(value)) {
          const inFilters = value.map((v) => `${field} eq '${v}'`).join(" or ");
          return `(${inFilters})`;
        }
        return "";

      case "contains":
        return `contains(${field}, '${value}')`;

      default:
        console.warn(`Unknown filter operator: ${operator}`);
        return "";
    }
  }

  /**
   * Extract field name from field path (without nested entity prefix)
   */
  private static getFieldName(fieldPath: string): string {
    if (fieldPath.includes("/")) {
      const parts = fieldPath.split("/");
      return parts[parts.length - 1];
    }
    return fieldPath;
  }

  /**
   * Build a simple query for data preview (with limit)
   */
  static buildPreviewQuery(
    apiVersion: string,
    dataSourceType: DataSourceType,
    dataSourceEntity: string,
    fieldMappings: FieldMappingConfig,
    filterConfig: FilterConfig,
    limit: number = 10,
  ): string {
    const baseQuery = this.buildQuery(
      apiVersion,
      dataSourceType,
      dataSourceEntity,
      fieldMappings,
      filterConfig,
    );

    // Add $top parameter for limiting results
    const separator = baseQuery.includes("?") ? "&" : "?";
    return `${baseQuery}${separator}$top=${limit}`;
  }

  /**
   * Build a count query to get total records
   */
  static buildCountQuery(
    apiVersion: string,
    dataSourceType: DataSourceType,
    dataSourceEntity: string,
    filterConfig: FilterConfig,
    fieldMappings: FieldMappingConfig,
  ): string {
    let baseEndpoint = "";

    if (dataSourceType === "REST_API") {
      baseEndpoint = `/entity/Default/${apiVersion}/${dataSourceEntity}`;
    } else if (dataSourceType === "GENERIC_INQUIRY") {
      baseEndpoint = `/odata/${dataSourceEntity}`;
    } else if (dataSourceType === "DAC_ODATA") {
      baseEndpoint = `/odatav4/${dataSourceEntity}`;
    }

    const filterClause = this.buildFilterClause(filterConfig, fieldMappings);

    return `${baseEndpoint}/$count${filterClause ? "?$filter=" + encodeURIComponent(filterClause) : ""}`;
  }

  /**
   * Extract field value from a record using field path
   * Handles nested paths like "Customer/CustomerName" or "Details/Amount"
   */
  static extractFieldValue(record: any, fieldPath: string): any {
    if (!fieldPath) {
      return null;
    }

    const parts = fieldPath.split("/");
    let value = record;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }

      // Handle arrays (for line-level data)
      if (Array.isArray(value)) {
        // For arrays, we typically want the first item or all items
        // This will be handled by the caller based on context
        return value;
      }

      value = value[part];
    }

    return value;
  }

  /**
   * Validate that a field mapping configuration has all required fields
   */
  static validateFieldMappings(fieldMappings: FieldMappingConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!fieldMappings.amount?.sourceField) {
      errors.push("Amount field mapping is required");
    }

    if (!fieldMappings.date?.sourceField) {
      errors.push("Date field mapping is required");
    }

    if (!fieldMappings.balance?.sourceField) {
      errors.push("Balance field mapping is required");
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
        errors.push(
          "Line amount field mapping is required for line-level imports",
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate filter configuration
   */
  static validateFilterConfig(filterConfig: FilterConfig): {
    valid: boolean;
    errors: string[];
  } {
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

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
