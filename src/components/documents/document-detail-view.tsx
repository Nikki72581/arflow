import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Hash,
  Receipt,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { EditDocumentDialog } from "@/components/documents/edit-document-dialog";
import { PaymentEntryDialog } from "@/components/payments/payment-entry-dialog";
import { DocumentActions } from "@/components/documents/document-actions";

interface DocumentDetailViewProps {
  document: any; // Type from getDocument action
}

const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  QUOTE: "Quote",
  ORDER: "Order",
  CREDIT_MEMO: "Credit Memo",
  DEBIT_MEMO: "Debit Memo",
};

export function DocumentDetailView({ document }: DocumentDetailViewProps) {
  const statusVariant =
    document.status === "PAID"
      ? "success"
      : document.status === "PARTIAL"
      ? "info"
      : document.status === "VOID"
      ? "secondary"
      : "warning";

  const documentTypeName = DOCUMENT_TYPE_NAMES[document.documentType as DocumentType] || document.documentType;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/documents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  {documentTypeName} {document.documentNumber}
                </h1>
                <Badge variant={statusVariant}>
                  {document.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created {formatDate(document.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <DocumentActions document={document} />
          {document.balanceDue > 0 && (
            <PaymentEntryDialog document={document} />
          )}
          {document.sourceType === "MANUAL" && (
            <EditDocumentDialog document={document} />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Document Information */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Document Type</p>
                <Badge variant="outline">{documentTypeName}</Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Document Number</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {document.documentNumber}
                </p>
              </div>
            </div>

            {document.referenceNumber && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Reference Number</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {document.referenceNumber}
                  </p>
                </div>
              </div>
            )}

            <Separator className="bg-purple-500/20" />

            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Customer</p>
                <Link
                  href={`/dashboard/clients/${document.customer.id}`}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {document.customer.companyName}
                </Link>
                {document.customer.customerNumber && (
                  <p className="text-xs text-muted-foreground">
                    #{document.customer.customerNumber}
                  </p>
                )}
              </div>
            </div>

            <Separator className="bg-purple-500/20" />

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Document Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(document.documentDate)}
                </p>
              </div>
            </div>

            {document.dueDate && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(document.dueDate)}
                  </p>
                </div>
              </div>
            )}

            {document.paidDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Paid Date</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(document.paidDate)}
                  </p>
                </div>
              </div>
            )}

            {document.externalSystem && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Integration Source</p>
                    <p className="text-sm text-muted-foreground">
                      {document.externalSystem}{" "}
                      {document.externalId ? `(${document.externalId})` : ""}
                    </p>
                  </div>
                </div>
              </>
            )}

            {document.description && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {document.description}
                  </p>
                </div>
              </>
            )}

            {document.notes && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Internal Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {document.notes}
                  </p>
                </div>
              </>
            )}

            {document.customerNotes && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Customer Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {document.customerNotes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Amount Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Amount Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-sm font-mono">
                  {formatCurrency(document.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Tax</span>
                <span className="text-sm font-mono">
                  {formatCurrency(document.taxAmount)}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <span className="text-lg font-bold">Total Amount</span>
                <span className="text-lg font-bold font-mono">
                  {formatCurrency(document.totalAmount)}
                </span>
              </div>

              {document.amountPaid > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Amount Paid
                  </span>
                  <span className="text-sm font-mono text-green-700 dark:text-green-400">
                    {formatCurrency(document.amountPaid)}
                  </span>
                </div>
              )}

              {document.balanceDue > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <span className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                    Balance Due
                  </span>
                  <span className="text-lg font-semibold font-mono text-orange-700 dark:text-orange-400">
                    {formatCurrency(document.balanceDue)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Applications */}
        {document.paymentApplications && document.paymentApplications.length > 0 && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {document.paymentApplications.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {app.payment.paymentNumber}
                        </span>
                        <Badge
                          variant={
                            app.payment.status === "APPLIED"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {app.payment.status}
                        </Badge>
                        <Badge variant="outline">
                          {app.payment.paymentMethod.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(app.payment.paymentDate)}
                        </span>
                        <span>Applied: {formatCurrency(app.amountApplied)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
