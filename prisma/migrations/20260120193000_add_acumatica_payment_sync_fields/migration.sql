-- AlterTable
ALTER TABLE "acumatica_integrations" ADD COLUMN     "defaultCashAccount" TEXT,
ADD COLUMN     "defaultPaymentMethod" TEXT;

-- AlterTable
ALTER TABLE "customer_payments" ADD COLUMN     "acumaticaPaymentRef" TEXT,
ADD COLUMN     "acumaticaSyncError" TEXT,
ADD COLUMN     "acumaticaSyncStatus" TEXT,
ADD COLUMN     "acumaticaSyncedAt" TIMESTAMP(3);
