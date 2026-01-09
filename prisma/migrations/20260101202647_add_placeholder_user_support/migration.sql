-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "clerkId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "acumatica_salesperson_mappings_userId_idx" ON "acumatica_salesperson_mappings"("userId");

-- CreateIndex
CREATE INDEX "users_email_organizationId_idx" ON "users"("email", "organizationId");

-- CreateIndex
CREATE INDEX "users_isPlaceholder_idx" ON "users"("isPlaceholder");
