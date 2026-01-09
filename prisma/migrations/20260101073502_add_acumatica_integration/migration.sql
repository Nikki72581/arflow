/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,externalId,externalSystem]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,externalId,externalSystem]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,externalId,externalSystem]` on the table `sales_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RecordSourceType" AS ENUM ('MANUAL', 'INTEGRATION', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncFrequency" AS ENUM ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "BranchFilterMode" AS ENUM ('ALL', 'SELECTED');

-- CreateEnum
CREATE TYPE "CustomerHandling" AS ENUM ('AUTO_CREATE', 'SKIP');

-- CreateEnum
CREATE TYPE "CustomerIdSource" AS ENUM ('CUSTOMER_CD', 'BACCOUNT_ID');

-- CreateEnum
CREATE TYPE "NoProjectHandling" AS ENUM ('NO_PROJECT', 'DEFAULT_PROJECT');

-- CreateEnum
CREATE TYPE "ImportLevel" AS ENUM ('INVOICE_TOTAL', 'LINE_LEVEL');

-- CreateEnum
CREATE TYPE "InvoiceAmountField" AS ENUM ('DOC_TOTAL', 'AMOUNT', 'LINES_TOTAL');

-- CreateEnum
CREATE TYPE "LineAmountField" AS ENUM ('EXTENDED_PRICE', 'AMOUNT');

-- CreateEnum
CREATE TYPE "LineFilterMode" AS ENUM ('ALL', 'ITEM_CLASS', 'GL_ACCOUNT');

-- CreateEnum
CREATE TYPE "SalespersonMappingStatus" AS ENUM ('PENDING', 'MATCHED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SalespersonMatchType" AS ENUM ('AUTO_EMAIL', 'AUTO_NAME', 'MANUAL', 'CREATED_NEW');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('STARTED', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "createdByIntegrationId" TEXT,
ADD COLUMN     "createdBySyncLogId" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSystem" TEXT,
ADD COLUMN     "sourceType" "RecordSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "createdByIntegrationId" TEXT,
ADD COLUMN     "createdBySyncLogId" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSystem" TEXT,
ADD COLUMN     "sourceType" "RecordSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "sales_transactions" ADD COLUMN     "externalBranch" TEXT,
ADD COLUMN     "externalGLAccount" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalInvoiceDate" TIMESTAMP(3),
ADD COLUMN     "externalInvoiceRef" TEXT,
ADD COLUMN     "externalItemClass" TEXT,
ADD COLUMN     "externalItemDescription" TEXT,
ADD COLUMN     "externalItemId" TEXT,
ADD COLUMN     "externalLineNumber" INTEGER,
ADD COLUMN     "externalQuantity" DECIMAL(65,30),
ADD COLUMN     "externalSystem" TEXT,
ADD COLUMN     "externalUnitPrice" DECIMAL(65,30),
ADD COLUMN     "integrationId" TEXT,
ADD COLUMN     "rawExternalData" JSONB,
ADD COLUMN     "sourceType" "RecordSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "syncLogId" TEXT;

-- CreateTable
CREATE TABLE "acumatica_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "lastConnectionTest" TIMESTAMP(3),
    "connectionErrorMessage" TEXT,
    "syncFrequency" "SyncFrequency" NOT NULL DEFAULT 'MANUAL',
    "syncTime" TEXT,
    "syncDayOfWeek" INTEGER,
    "lastSyncAt" TIMESTAMP(3),
    "nextScheduledSync" TIMESTAMP(3),
    "invoiceStartDate" TIMESTAMP(3) NOT NULL,
    "invoiceEndDate" TIMESTAMP(3),
    "branchFilterMode" "BranchFilterMode" NOT NULL DEFAULT 'ALL',
    "selectedBranches" JSONB,
    "includeInvoices" BOOLEAN NOT NULL DEFAULT true,
    "includeCreditMemos" BOOLEAN NOT NULL DEFAULT false,
    "includeDebitMemos" BOOLEAN NOT NULL DEFAULT false,
    "customerHandling" "CustomerHandling" NOT NULL DEFAULT 'AUTO_CREATE',
    "customerIdSource" "CustomerIdSource" NOT NULL DEFAULT 'CUSTOMER_CD',
    "projectAutoCreate" BOOLEAN NOT NULL DEFAULT true,
    "noProjectHandling" "NoProjectHandling" NOT NULL DEFAULT 'NO_PROJECT',
    "importLevel" "ImportLevel" NOT NULL DEFAULT 'INVOICE_TOTAL',
    "invoiceAmountField" "InvoiceAmountField" NOT NULL DEFAULT 'AMOUNT',
    "lineAmountField" "LineAmountField" NOT NULL DEFAULT 'EXTENDED_PRICE',
    "lineFilterMode" "LineFilterMode" NOT NULL DEFAULT 'ALL',
    "lineFilterValues" JSONB,
    "storeItemId" BOOLEAN NOT NULL DEFAULT true,
    "storeItemDescription" BOOLEAN NOT NULL DEFAULT true,
    "storeItemClass" BOOLEAN NOT NULL DEFAULT false,
    "storeGLAccount" BOOLEAN NOT NULL DEFAULT false,
    "storeQtyAndPrice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acumatica_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acumatica_salesperson_mappings" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "acumaticaSalespersonId" TEXT NOT NULL,
    "acumaticaSalespersonName" TEXT NOT NULL,
    "acumaticaEmail" TEXT,
    "status" "SalespersonMappingStatus" NOT NULL DEFAULT 'PENDING',
    "matchType" "SalespersonMatchType",
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acumatica_salesperson_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "syncType" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredById" TEXT,
    "invoicesFetched" INTEGER NOT NULL DEFAULT 0,
    "invoicesProcessed" INTEGER NOT NULL DEFAULT 0,
    "invoicesSkipped" INTEGER NOT NULL DEFAULT 0,
    "salesCreated" INTEGER NOT NULL DEFAULT 0,
    "clientsCreated" INTEGER NOT NULL DEFAULT 0,
    "projectsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "skipDetails" JSONB,
    "errorDetails" JSONB,
    "createdRecords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acumatica_integrations_organizationId_key" ON "acumatica_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "acumatica_integrations_organizationId_idx" ON "acumatica_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "acumatica_salesperson_mappings_integrationId_idx" ON "acumatica_salesperson_mappings"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "acumatica_salesperson_mappings_integrationId_acumaticaSales_key" ON "acumatica_salesperson_mappings"("integrationId", "acumaticaSalespersonId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_integrationId_idx" ON "integration_sync_logs"("integrationId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_startedAt_idx" ON "integration_sync_logs"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organizationId_externalId_externalSystem_key" ON "clients"("organizationId", "externalId", "externalSystem");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organizationId_externalId_externalSystem_key" ON "projects"("organizationId", "externalId", "externalSystem");

-- CreateIndex
CREATE UNIQUE INDEX "sales_transactions_organizationId_externalId_externalSystem_key" ON "sales_transactions"("organizationId", "externalId", "externalSystem");

-- AddForeignKey
ALTER TABLE "acumatica_integrations" ADD CONSTRAINT "acumatica_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acumatica_salesperson_mappings" ADD CONSTRAINT "acumatica_salesperson_mappings_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "acumatica_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "acumatica_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
