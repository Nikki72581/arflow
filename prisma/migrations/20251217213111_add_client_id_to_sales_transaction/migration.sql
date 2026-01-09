-- AlterTable
ALTER TABLE "sales_transactions" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE INDEX "sales_transactions_clientId_idx" ON "sales_transactions"("clientId");

-- AddForeignKey
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
