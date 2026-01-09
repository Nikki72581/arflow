-- AlterTable
ALTER TABLE "commission_rules" ADD COLUMN     "maxSaleAmount" DOUBLE PRECISION,
ADD COLUMN     "minSaleAmount" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "commission_rules_minSaleAmount_maxSaleAmount_idx" ON "commission_rules"("minSaleAmount", "maxSaleAmount");

-- Data Migration: Convert existing TIERED rules to PERCENTAGE rules with amount ranges
-- This preserves the commission structure while using the new amount-based filtering system

-- Step 1: Create base tier rules (0 to threshold)
-- These handle sales below the tier threshold
INSERT INTO commission_rules (
  id,
  "commissionPlanId",
  "ruleType",
  percentage,
  "minSaleAmount",
  "maxSaleAmount",
  scope,
  priority,
  "customerTier",
  "productCategoryId",
  "territoryId",
  "clientId",
  "minAmount",
  "maxAmount",
  description,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "commissionPlanId",
  'PERCENTAGE',
  percentage,
  0,
  "tierThreshold",
  scope,
  priority,
  "customerTier",
  "productCategoryId",
  "territoryId",
  "clientId",
  "minAmount",
  "maxAmount",
  COALESCE(description, '') || ' [Migrated - Base Tier: $0-$' || "tierThreshold" || ']',
  NOW(),
  NOW()
FROM commission_rules
WHERE "ruleType" = 'TIERED'
  AND "tierThreshold" IS NOT NULL
  AND percentage IS NOT NULL;

-- Step 2: Create upper tier rules (threshold to infinity)
-- These handle sales above the tier threshold
INSERT INTO commission_rules (
  id,
  "commissionPlanId",
  "ruleType",
  percentage,
  "minSaleAmount",
  "maxSaleAmount",
  scope,
  priority,
  "customerTier",
  "productCategoryId",
  "territoryId",
  "clientId",
  "minAmount",
  "maxAmount",
  description,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "commissionPlanId",
  'PERCENTAGE',
  "tierPercentage",
  "tierThreshold",
  NULL,
  scope,
  priority,
  "customerTier",
  "productCategoryId",
  "territoryId",
  "clientId",
  "minAmount",
  "maxAmount",
  COALESCE(description, '') || ' [Migrated - Upper Tier: $' || "tierThreshold" || '+]',
  NOW(),
  NOW()
FROM commission_rules
WHERE "ruleType" = 'TIERED'
  AND "tierThreshold" IS NOT NULL
  AND "tierPercentage" IS NOT NULL;

-- Step 3: Archive original TIERED rules (soft delete for potential rollback)
-- We keep these in the database but mark them as archived
UPDATE commission_rules
SET description = COALESCE(description, '') || ' [ARCHIVED - Migrated to amount ranges on ' || NOW() || ']'
WHERE "ruleType" = 'TIERED';
