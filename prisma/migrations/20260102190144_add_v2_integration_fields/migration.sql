-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('REST_API', 'GENERIC_INQUIRY', 'DAC_ODATA');

-- CreateEnum
CREATE TYPE "UnmappedAction" AS ENUM ('SKIP', 'DEFAULT_USER');

-- AlterTable
ALTER TABLE "acumatica_integrations" ADD COLUMN     "dataSourceEndpoint" TEXT,
ADD COLUMN     "dataSourceEntity" TEXT NOT NULL DEFAULT 'Invoice',
ADD COLUMN     "dataSourceType" "DataSourceType" NOT NULL DEFAULT 'REST_API',
ADD COLUMN     "defaultSalespersonUserId" TEXT,
ADD COLUMN     "discoveredSchema" JSONB,
ADD COLUMN     "fieldMappings" JSONB,
ADD COLUMN     "filterConfig" JSONB,
ADD COLUMN     "schemaLastUpdated" TIMESTAMP(3),
ADD COLUMN     "unmappedSalespersonAction" "UnmappedAction" NOT NULL DEFAULT 'SKIP',
ALTER COLUMN "invoiceStartDate" DROP NOT NULL,
ALTER COLUMN "branchFilterMode" DROP NOT NULL,
ALTER COLUMN "includeInvoices" DROP NOT NULL,
ALTER COLUMN "includeCreditMemos" DROP NOT NULL,
ALTER COLUMN "includeDebitMemos" DROP NOT NULL,
ALTER COLUMN "customerHandling" DROP NOT NULL,
ALTER COLUMN "customerIdSource" DROP NOT NULL,
ALTER COLUMN "projectAutoCreate" DROP NOT NULL,
ALTER COLUMN "noProjectHandling" DROP NOT NULL,
ALTER COLUMN "importLevel" DROP NOT NULL,
ALTER COLUMN "invoiceAmountField" DROP NOT NULL,
ALTER COLUMN "lineAmountField" DROP NOT NULL,
ALTER COLUMN "lineFilterMode" DROP NOT NULL,
ALTER COLUMN "storeItemId" DROP NOT NULL,
ALTER COLUMN "storeItemDescription" DROP NOT NULL,
ALTER COLUMN "storeItemClass" DROP NOT NULL,
ALTER COLUMN "storeGLAccount" DROP NOT NULL,
ALTER COLUMN "storeQtyAndPrice" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sales_transactions" ADD COLUMN     "customFieldValues" JSONB;
