-- CreateIndex
CREATE UNIQUE INDEX "payment_applications_paymentId_arDocumentId_key" ON "payment_applications"("paymentId", "arDocumentId");
