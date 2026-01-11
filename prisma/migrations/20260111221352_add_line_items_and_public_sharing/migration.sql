-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'QUOTE', 'ORDER', 'CREDIT_MEMO', 'DEBIT_MEMO');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPLIED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CHECK', 'WIRE', 'ACH', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_HOLD', 'COLLECTIONS');

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
CREATE TYPE "DataSourceType" AS ENUM ('REST_API', 'GENERIC_INQUIRY', 'DAC_ODATA');

-- CreateEnum
CREATE TYPE "UnmappedAction" AS ENUM ('SKIP', 'DEFAULT_USER');

-- CreateEnum
CREATE TYPE "CustomerMappingStatus" AS ENUM ('PENDING', 'MATCHED', 'PLACEHOLDER', 'IGNORED');

-- CreateEnum
CREATE TYPE "CustomerMatchType" AS ENUM ('AUTO_EMAIL', 'AUTO_NAME', 'AUTO_PLACEHOLDER', 'MANUAL', 'CREATED_NEW');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('STARTED', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('AUTHORIZE_NET', 'STRIPE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clerkOrgId" TEXT,
    "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logoUrl" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "customerId" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "invoiceAlerts" BOOLEAN NOT NULL DEFAULT true,
    "paymentAlerts" BOOLEAN NOT NULL DEFAULT true,
    "statementAlerts" BOOLEAN NOT NULL DEFAULT false,
    "themePreference" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "organizationId" TEXT NOT NULL,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingZip" TEXT,
    "billingCountry" TEXT,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingZip" TEXT,
    "shippingCountry" TEXT,
    "creditLimit" DOUBLE PRECISION DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_terms_legacy" TEXT,
    "paymentTermId" TEXT,
    "notes" TEXT,
    "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "externalId" TEXT,
    "externalSystem" TEXT,
    "sourceType" "RecordSourceType" NOT NULL DEFAULT 'MANUAL',
    "createdByIntegrationId" TEXT,
    "createdBySyncLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "notes" TEXT,
    "customerNotes" TEXT,
    "paymentTermId" TEXT,
    "appliedPaymentTerm" JSONB,
    "earlyPaymentDeadline" TIMESTAMP(3),
    "discountPercentage" DOUBLE PRECISION,
    "discountAvailable" DOUBLE PRECISION,
    "discountTaken" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasPaymentSchedule" BOOLEAN NOT NULL DEFAULT false,
    "publicShareToken" TEXT,
    "publicShareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicShareCreatedAt" TIMESTAMP(3),
    "sourceType" "RecordSourceType" NOT NULL DEFAULT 'MANUAL',
    "externalSystem" TEXT,
    "externalId" TEXT,
    "integrationId" TEXT,
    "syncLogId" TEXT,
    "externalInvoiceRef" TEXT,
    "externalBranch" TEXT,
    "externalLineNumber" INTEGER,
    "externalItemId" TEXT,
    "externalDescription" TEXT,
    "rawExternalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ar_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_document_line_items" (
    "id" TEXT NOT NULL,
    "arDocumentId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineSubtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ar_document_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_type_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_type_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_term_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "daysDue" INTEGER NOT NULL,
    "hasDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountDays" INTEGER,
    "discountPercentage" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_term_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedule_installments" (
    "id" TEXT NOT NULL,
    "arDocumentId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'OPEN',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedule_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CHECK',
    "referenceNumber" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "gatewayTransactionId" TEXT,
    "gatewayResponse" JSONB,
    "last4Digits" TEXT,
    "cardType" TEXT,
    "paymentGatewayProvider" "PaymentGatewayProvider",
    "stripeCheckoutSessionId" TEXT,
    "checkoutSessionStatus" TEXT,
    "checkoutSessionUrl" TEXT,
    "sessionExpiresAt" TIMESTAMP(3),
    "checkoutMode" TEXT,
    "sourceType" "RecordSourceType" NOT NULL DEFAULT 'MANUAL',
    "externalSystem" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_applications" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "arDocumentId" TEXT NOT NULL,
    "amountApplied" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "payment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "organizationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

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
    "dataSourceType" "DataSourceType" NOT NULL DEFAULT 'REST_API',
    "dataSourceEntity" TEXT NOT NULL DEFAULT 'Invoice',
    "dataSourceEndpoint" TEXT,
    "discoveredSchema" JSONB,
    "schemaLastUpdated" TIMESTAMP(3),
    "fieldMappings" JSONB,
    "filterConfig" JSONB,
    "unmappedCustomerAction" "UnmappedAction" NOT NULL DEFAULT 'SKIP',
    "defaultCustomerUserId" TEXT,
    "syncFrequency" "SyncFrequency" NOT NULL DEFAULT 'MANUAL',
    "syncTime" TEXT,
    "syncDayOfWeek" INTEGER,
    "lastSyncAt" TIMESTAMP(3),
    "nextScheduledSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acumatica_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acumatica_customer_mappings" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "acumaticaCustomerId" TEXT NOT NULL,
    "acumaticaCustomerName" TEXT NOT NULL,
    "acumaticaEmail" TEXT,
    "status" "CustomerMappingStatus" NOT NULL DEFAULT 'PENDING',
    "matchType" "CustomerMatchType",
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acumatica_customer_mappings_pkey" PRIMARY KEY ("id")
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
    "documentsCreated" INTEGER NOT NULL DEFAULT 0,
    "customersCreated" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "skipDetails" JSONB,
    "errorDetails" JSONB,
    "createdRecords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorize_net_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apiLoginId" TEXT NOT NULL,
    "encryptedTransactionKey" TEXT NOT NULL,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastConnectionTest" TIMESTAMP(3),
    "connectionErrorMessage" TEXT,
    "enableCustomerPayments" BOOLEAN NOT NULL DEFAULT true,
    "enablePaymentLinks" BOOLEAN NOT NULL DEFAULT false,
    "enableTerminals" BOOLEAN NOT NULL DEFAULT false,
    "requireCVV" BOOLEAN NOT NULL DEFAULT true,
    "requireBillingAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authorize_net_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "encryptedSecretKey" TEXT NOT NULL,
    "encryptedPublishableKey" TEXT NOT NULL,
    "encryptedWebhookSecret" TEXT,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastConnectionTest" TIMESTAMP(3),
    "connectionErrorMessage" TEXT,
    "enableCustomerPayments" BOOLEAN NOT NULL DEFAULT true,
    "enablePaymentLinks" BOOLEAN NOT NULL DEFAULT false,
    "enableSavedCards" BOOLEAN NOT NULL DEFAULT false,
    "requireCVV" BOOLEAN NOT NULL DEFAULT true,
    "requireBillingAddress" BOOLEAN NOT NULL DEFAULT true,
    "captureMethod" TEXT NOT NULL DEFAULT 'automatic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateway_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activeProvider" "PaymentGatewayProvider",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateway_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_clerkOrgId_key" ON "organizations"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_customerId_key" ON "users"("customerId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_email_organizationId_idx" ON "users"("email", "organizationId");

-- CreateIndex
CREATE INDEX "users_isPlaceholder_idx" ON "users"("isPlaceholder");

-- CreateIndex
CREATE INDEX "users_customerId_idx" ON "users"("customerId");

-- CreateIndex
CREATE INDEX "customers_organizationId_idx" ON "customers"("organizationId");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_customerNumber_idx" ON "customers"("customerNumber");

-- CreateIndex
CREATE INDEX "customers_paymentTermId_idx" ON "customers"("paymentTermId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organizationId_externalId_externalSystem_key" ON "customers"("organizationId", "externalId", "externalSystem");

-- CreateIndex
CREATE UNIQUE INDEX "ar_documents_publicShareToken_key" ON "ar_documents"("publicShareToken");

-- CreateIndex
CREATE INDEX "ar_documents_organizationId_idx" ON "ar_documents"("organizationId");

-- CreateIndex
CREATE INDEX "ar_documents_customerId_idx" ON "ar_documents"("customerId");

-- CreateIndex
CREATE INDEX "ar_documents_documentType_idx" ON "ar_documents"("documentType");

-- CreateIndex
CREATE INDEX "ar_documents_status_idx" ON "ar_documents"("status");

-- CreateIndex
CREATE INDEX "ar_documents_documentDate_idx" ON "ar_documents"("documentDate");

-- CreateIndex
CREATE INDEX "ar_documents_dueDate_idx" ON "ar_documents"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ar_documents_organizationId_externalId_externalSystem_key" ON "ar_documents"("organizationId", "externalId", "externalSystem");

-- CreateIndex
CREATE INDEX "ar_document_line_items_arDocumentId_idx" ON "ar_document_line_items"("arDocumentId");

-- CreateIndex
CREATE INDEX "document_type_settings_organizationId_idx" ON "document_type_settings"("organizationId");

-- CreateIndex
CREATE INDEX "document_type_settings_enabled_idx" ON "document_type_settings"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "document_type_settings_organizationId_documentType_key" ON "document_type_settings"("organizationId", "documentType");

-- CreateIndex
CREATE INDEX "payment_term_types_organizationId_idx" ON "payment_term_types"("organizationId");

-- CreateIndex
CREATE INDEX "payment_term_types_enabled_idx" ON "payment_term_types"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "payment_term_types_organizationId_code_key" ON "payment_term_types"("organizationId", "code");

-- CreateIndex
CREATE INDEX "payment_schedule_installments_arDocumentId_idx" ON "payment_schedule_installments"("arDocumentId");

-- CreateIndex
CREATE INDEX "payment_schedule_installments_dueDate_idx" ON "payment_schedule_installments"("dueDate");

-- CreateIndex
CREATE INDEX "payment_schedule_installments_status_idx" ON "payment_schedule_installments"("status");

-- CreateIndex
CREATE INDEX "customer_payments_organizationId_idx" ON "customer_payments"("organizationId");

-- CreateIndex
CREATE INDEX "customer_payments_customerId_idx" ON "customer_payments"("customerId");

-- CreateIndex
CREATE INDEX "customer_payments_paymentDate_idx" ON "customer_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "customer_payments_status_idx" ON "customer_payments"("status");

-- CreateIndex
CREATE INDEX "customer_payments_gatewayTransactionId_idx" ON "customer_payments"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "customer_payments_stripeCheckoutSessionId_idx" ON "customer_payments"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "payment_applications_paymentId_idx" ON "payment_applications"("paymentId");

-- CreateIndex
CREATE INDEX "payment_applications_arDocumentId_idx" ON "payment_applications"("arDocumentId");

-- CreateIndex
CREATE INDEX "payment_applications_organizationId_idx" ON "payment_applications"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "acumatica_integrations_organizationId_key" ON "acumatica_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "acumatica_integrations_organizationId_idx" ON "acumatica_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "acumatica_customer_mappings_integrationId_idx" ON "acumatica_customer_mappings"("integrationId");

-- CreateIndex
CREATE INDEX "acumatica_customer_mappings_customerId_idx" ON "acumatica_customer_mappings"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "acumatica_customer_mappings_integrationId_acumaticaCustomer_key" ON "acumatica_customer_mappings"("integrationId", "acumaticaCustomerId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_integrationId_idx" ON "integration_sync_logs"("integrationId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_startedAt_idx" ON "integration_sync_logs"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "authorize_net_integrations_organizationId_key" ON "authorize_net_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "authorize_net_integrations_organizationId_idx" ON "authorize_net_integrations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_integrations_organizationId_key" ON "stripe_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "stripe_integrations_organizationId_idx" ON "stripe_integrations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_settings_organizationId_key" ON "payment_gateway_settings"("organizationId");

-- CreateIndex
CREATE INDEX "payment_gateway_settings_organizationId_idx" ON "payment_gateway_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "payment_term_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_documents" ADD CONSTRAINT "ar_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_documents" ADD CONSTRAINT "ar_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_document_line_items" ADD CONSTRAINT "ar_document_line_items_arDocumentId_fkey" FOREIGN KEY ("arDocumentId") REFERENCES "ar_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_type_settings" ADD CONSTRAINT "document_type_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_term_types" ADD CONSTRAINT "payment_term_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule_installments" ADD CONSTRAINT "payment_schedule_installments_arDocumentId_fkey" FOREIGN KEY ("arDocumentId") REFERENCES "ar_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "customer_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_arDocumentId_fkey" FOREIGN KEY ("arDocumentId") REFERENCES "ar_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acumatica_integrations" ADD CONSTRAINT "acumatica_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acumatica_customer_mappings" ADD CONSTRAINT "acumatica_customer_mappings_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "acumatica_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "acumatica_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorize_net_integrations" ADD CONSTRAINT "authorize_net_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_integrations" ADD CONSTRAINT "stripe_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_gateway_settings" ADD CONSTRAINT "payment_gateway_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
