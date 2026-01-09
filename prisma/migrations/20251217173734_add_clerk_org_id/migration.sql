-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "clerkOrgId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_clerkOrgId_key" ON "organizations"("clerkOrgId");
