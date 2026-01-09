/**
 * Acumatica Integration v1 to v2 Migration Script
 *
 * This script migrates existing AcumaticaIntegration records from the
 * hardcoded v1 configuration to the dynamic v2 field mapping system.
 *
 * Usage:
 *   npx tsx scripts/migrate-acumatica-v2.ts
 *
 * What it does:
 * 1. Finds all existing AcumaticaIntegration records
 * 2. Converts v1 hardcoded fields to v2 JSON configurations
 * 3. Updates records with new field mappings and filter configs
 * 4. Creates backup of original data for rollback
 */

import { PrismaClient } from "@prisma/client";
import { FieldMappingConfig, FilterConfig } from "@/lib/acumatica/config-types";

const prisma = new PrismaClient();

interface V1Integration {
  id: string;
  organizationId: string;
  instanceUrl: string;
  apiVersion: string;
  companyId: string;

  // v1 fields to migrate
  invoiceStartDate: Date | null;
  invoiceEndDate: Date | null;
  branchFilterMode: string | null;
  selectedBranches: any;
  includeInvoices: boolean | null;
  includeCreditMemos: boolean | null;
  includeDebitMemos: boolean | null;
  customerHandling: string | null;
  customerIdSource: string | null;
  projectAutoCreate: boolean | null;
  noProjectHandling: string | null;
  importLevel: string | null;
  invoiceAmountField: string | null;
  lineAmountField: string | null;
  lineFilterMode: string | null;
  lineFilterValues: any;
  storeItemId: boolean | null;
  storeItemDescription: boolean | null;
  storeItemClass: boolean | null;
  storeGLAccount: boolean | null;
  storeQtyAndPrice: boolean | null;
}

/**
 * Build field mappings from v1 configuration
 */
function buildFieldMappings(integration: V1Integration): FieldMappingConfig {
  const importLevel = integration.importLevel || "INVOICE_TOTAL";

  const fieldMappings: FieldMappingConfig = {
    // Required mappings - based on v1 defaults
    amount: {
      sourceField: integration.invoiceAmountField || "Amount",
      sourceType: "decimal",
    },

    date: {
      sourceField: "Date",
      sourceType: "date",
    },

    salesperson: {
      // v1 always used the commission detail tab
      sourceField: "Commissions/SalesPersons/SalespersonID",
      sourceLevel: "detail_tab",
    },

    uniqueId: {
      sourceField: "ReferenceNbr",
    },

    customer: {
      idField: integration.customerIdSource === "BACCOUNT_ID"
        ? "Customer/BAccountID"
        : "CustomerID",
      nameField: "Customer/CustomerName",
    },

    // Optional mappings
    project: {
      sourceField: "Project",
    },

    description: {
      sourceField: "Description",
    },

    branch: {
      sourceField: "BranchID",
    },

    // Line-level mappings (if applicable)
    importLevel: importLevel as "INVOICE_TOTAL" | "LINE_LEVEL",
  };

  // Add line-level specific mappings
  if (importLevel === "LINE_LEVEL") {
    fieldMappings.lineAmount = {
      sourceField: integration.lineAmountField === "AMOUNT"
        ? "Details/Amount"
        : "Details/ExtPrice",
      sourceType: "decimal",
    };

    // Only add line item mapping if we're storing item data
    if (integration.storeItemId || integration.storeItemDescription) {
      fieldMappings.lineItem = {
        idField: "Details/InventoryID",
        descriptionField: integration.storeItemDescription
          ? "Details/TranDesc"
          : undefined,
        classField: integration.storeItemClass
          ? "Details/ItemClass"
          : undefined,
      };
    }
  }

  return fieldMappings;
}

/**
 * Build filter config from v1 configuration
 */
function buildFilterConfig(integration: V1Integration): FilterConfig {
  const documentTypes: string[] = [];

  if (integration.includeInvoices !== false) {
    documentTypes.push("Invoice");
  }
  if (integration.includeCreditMemos === true) {
    documentTypes.push("Credit Memo");
  }
  if (integration.includeDebitMemos === true) {
    documentTypes.push("Debit Memo");
  }

  const filterConfig: FilterConfig = {
    // Status filter - v1 default was to include Open and Closed
    status: {
      field: "Status",
      allowedValues: ["Open", "Closed"],
    },

    // Document type filter
    documentType: documentTypes.length > 0 ? {
      field: "Type",
      allowedValues: documentTypes,
    } : undefined,

    // Date range filter
    dateRange: {
      field: "Date",
      startDate: integration.invoiceStartDate?.toISOString() || new Date().toISOString(),
      endDate: integration.invoiceEndDate?.toISOString(),
    },
  };

  // Branch filter
  if (integration.branchFilterMode === "SELECTED" && integration.selectedBranches) {
    const branches = Array.isArray(integration.selectedBranches)
      ? integration.selectedBranches
      : [];

    if (branches.length > 0) {
      filterConfig.branch = {
        field: "BranchID",
        mode: "SELECTED",
        selectedValues: branches,
      };
    }
  }

  // Line filters (for line-level imports)
  if (integration.importLevel === "LINE_LEVEL") {
    const lineFilterMode = integration.lineFilterMode || "ALL";

    if (lineFilterMode !== "ALL" && integration.lineFilterValues) {
      const values = Array.isArray(integration.lineFilterValues)
        ? integration.lineFilterValues
        : [];

      if (values.length > 0) {
        filterConfig.lineFilters = {
          mode: lineFilterMode as "ALL" | "ITEM_CLASS" | "GL_ACCOUNT",
          field: lineFilterMode === "ITEM_CLASS"
            ? "Details/ItemClass"
            : "Details/AccountID",
          allowedValues: values,
        };
      }
    }
  }

  return filterConfig;
}

/**
 * Main migration function
 */
async function migrateToV2() {
  console.log("=".repeat(60));
  console.log("Acumatica Integration v1 → v2 Migration");
  console.log("=".repeat(60));
  console.log();

  try {
    // Step 1: Find all existing integrations
    console.log("Step 1: Finding existing integrations...");
    const integrations = await prisma.acumaticaIntegration.findMany();
    console.log(`Found ${integrations.length} integration(s) to migrate`);
    console.log();

    if (integrations.length === 0) {
      console.log("No integrations found. Migration complete.");
      return;
    }

    // Step 2: Create backup table
    console.log("Step 2: Creating backup of original data...");

    // We'll store the backup in JSON format in a separate table or file
    // For now, we'll just log the backup data
    const backup = integrations.map((integration) => ({
      id: integration.id,
      organizationId: integration.organizationId,
      v1Config: {
        invoiceStartDate: integration.invoiceStartDate,
        invoiceEndDate: integration.invoiceEndDate,
        branchFilterMode: integration.branchFilterMode,
        selectedBranches: integration.selectedBranches,
        includeInvoices: integration.includeInvoices,
        includeCreditMemos: integration.includeCreditMemos,
        includeDebitMemos: integration.includeDebitMemos,
        customerHandling: integration.customerHandling,
        customerIdSource: integration.customerIdSource,
        projectAutoCreate: integration.projectAutoCreate,
        noProjectHandling: integration.noProjectHandling,
        importLevel: integration.importLevel,
        invoiceAmountField: integration.invoiceAmountField,
        lineAmountField: integration.lineAmountField,
        lineFilterMode: integration.lineFilterMode,
        lineFilterValues: integration.lineFilterValues,
        storeItemId: integration.storeItemId,
        storeItemDescription: integration.storeItemDescription,
        storeItemClass: integration.storeItemClass,
        storeGLAccount: integration.storeGLAccount,
        storeQtyAndPrice: integration.storeQtyAndPrice,
      },
    }));

    // Write backup to file
    const fs = require('fs');
    const backupPath = `./backups/acumatica-v1-backup-${Date.now()}.json`;

    // Create backups directory if it doesn't exist
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups', { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`Backup saved to: ${backupPath}`);
    console.log();

    // Step 3: Migrate each integration
    console.log("Step 3: Migrating integrations...");

    let successCount = 0;
    let errorCount = 0;

    for (const integration of integrations) {
      try {
        console.log(`\nMigrating integration ${integration.id}...`);
        console.log(`  Organization: ${integration.organizationId}`);

        // Build v2 configurations
        const fieldMappings = buildFieldMappings(integration as V1Integration);
        const filterConfig = buildFilterConfig(integration as V1Integration);

        console.log(`  Field mappings: ${Object.keys(fieldMappings).length} fields`);
        console.log(`  Filter config: ${Object.keys(filterConfig).length} filters`);

        // Update the integration with v2 fields
        await prisma.acumaticaIntegration.update({
          where: { id: integration.id },
          data: {
            // v2 fields
            dataSourceType: "REST_API",
            dataSourceEntity: "Invoice",
            dataSourceEndpoint: `/entity/Default/${integration.apiVersion}/Invoice`,
            fieldMappings: fieldMappings as any,
            filterConfig: filterConfig as any,
            unmappedSalespersonAction: "SKIP", // v1 default behavior

            // Keep v1 fields for now (they're nullable in schema)
            // We can remove them in a later cleanup migration
          },
        });

        console.log(`  ✓ Successfully migrated`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error migrating integration ${integration.id}:`, error);
        errorCount++;
      }
    }

    // Step 4: Summary
    console.log();
    console.log("=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(`Total integrations: ${integrations.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log();
    console.log(`Backup location: ${backupPath}`);
    console.log();

    if (errorCount > 0) {
      console.log("⚠️  Some integrations failed to migrate. Check the errors above.");
      console.log("   The database has been partially updated. Review and retry if needed.");
    } else {
      console.log("✅ All integrations successfully migrated to v2!");
      console.log();
      console.log("Next steps:");
      console.log("1. Test the migrated integrations");
      console.log("2. Verify field mappings and filters are correct");
      console.log("3. Run a test sync to confirm everything works");
    }

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Rollback function (if needed)
 */
async function rollback(backupFile: string) {
  console.log("=".repeat(60));
  console.log("Acumatica Integration v2 → v1 Rollback");
  console.log("=".repeat(60));
  console.log();

  try {
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

    console.log(`Restoring ${backup.length} integration(s) from backup...`);

    for (const item of backup) {
      await prisma.acumaticaIntegration.update({
        where: { id: item.id },
        data: {
          // Restore v1 fields
          ...item.v1Config,

          // Clear v2 fields
          fieldMappings: null,
          filterConfig: null,
          discoveredSchema: null,
          schemaLastUpdated: null,
        },
      });

      console.log(`  ✓ Restored integration ${item.id}`);
    }

    console.log();
    console.log("✅ Rollback complete!");

  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'rollback' && args[1]) {
    rollback(args[1]).catch((error) => {
      console.error(error);
      process.exit(1);
    });
  } else {
    migrateToV2().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }
}

export { migrateToV2, rollback };
