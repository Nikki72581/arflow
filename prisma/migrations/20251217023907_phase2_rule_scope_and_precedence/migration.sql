-- CreateEnum
CREATE TYPE "RuleScope" AS ENUM ('GLOBAL', 'CUSTOMER_TIER', 'PRODUCT_CATEGORY', 'TERRITORY', 'CUSTOMER_SPECIFIC');

-- CreateEnum
CREATE TYPE "RulePriority" AS ENUM ('PROJECT_SPECIFIC', 'CUSTOMER_SPECIFIC', 'PRODUCT_CATEGORY', 'TERRITORY', 'CUSTOMER_TIER', 'DEFAULT');

-- AlterTable
ALTER TABLE "commission_calculations" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "commission_rules" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "customerTier" "CustomerTier",
ADD COLUMN     "priority" "RulePriority" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "productCategoryId" TEXT,
ADD COLUMN     "scope" "RuleScope" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "territoryId" TEXT;

-- CreateIndex
CREATE INDEX "commission_rules_scope_idx" ON "commission_rules"("scope");

-- CreateIndex
CREATE INDEX "commission_rules_priority_idx" ON "commission_rules"("priority");

-- CreateIndex
CREATE INDEX "commission_rules_productCategoryId_idx" ON "commission_rules"("productCategoryId");

-- CreateIndex
CREATE INDEX "commission_rules_territoryId_idx" ON "commission_rules"("territoryId");

-- CreateIndex
CREATE INDEX "commission_rules_clientId_idx" ON "commission_rules"("clientId");

-- CreateIndex
CREATE INDEX "commission_rules_customerTier_idx" ON "commission_rules"("customerTier");

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
