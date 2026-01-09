-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('GROSS_REVENUE', 'NET_SALES');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('STANDARD', 'VIP', 'NEW', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "territoryId" TEXT,
ADD COLUMN     "tier" "CustomerTier" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "commission_plans" ADD COLUMN     "commissionBasis" "CommissionBasis" NOT NULL DEFAULT 'GROSS_REVENUE';

-- AlterTable
ALTER TABLE "sales_transactions" ADD COLUMN     "parentTransactionId" TEXT,
ADD COLUMN     "productCategoryId" TEXT,
ADD COLUMN     "transactionType" "TransactionType" NOT NULL DEFAULT 'SALE';

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_categories_organizationId_idx" ON "product_categories"("organizationId");

-- CreateIndex
CREATE INDEX "territories_organizationId_idx" ON "territories"("organizationId");

-- CreateIndex
CREATE INDEX "clients_territoryId_idx" ON "clients"("territoryId");

-- CreateIndex
CREATE INDEX "clients_tier_idx" ON "clients"("tier");

-- CreateIndex
CREATE INDEX "commission_plans_commissionBasis_idx" ON "commission_plans"("commissionBasis");

-- CreateIndex
CREATE INDEX "sales_transactions_productCategoryId_idx" ON "sales_transactions"("productCategoryId");

-- CreateIndex
CREATE INDEX "sales_transactions_transactionType_idx" ON "sales_transactions"("transactionType");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "sales_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
