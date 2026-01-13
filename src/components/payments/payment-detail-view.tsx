"use client";

import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Hash,
  Building2,
  FileText,
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { VoidPaymentDialog } from "./void-payment-dialog";
import { PaymentExportButton } from "./payment-export-button";

interface PaymentDetailViewProps {
  payment: any;
}

export function PaymentDetailView({ payment }: PaymentDetailViewProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "APPLIED":
        return "success";
      case "PENDING":
        return "warning";
      case "VOID":
        return "secondary";
      default:
        return "default";
    }
  };

  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case "CREDIT_CARD":
        return "Credit Card";
      case "CHECK":
        return "Check";
      case "WIRE":
        return "Wire Transfer";
      case "ACH":
        return "ACH";
      case "OTHER":
        return "Other";
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/payments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payments
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              {payment.paymentNumber}
            </h1>
            <Badge variant={getStatusVariant(payment.status)}>
              {payment.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <PaymentExportButton payments={[payment]} variant="detail" />
          {payment.status === "APPLIED" && (
            <VoidPaymentDialog
              paymentId={payment.id}
              paymentNumber={payment.paymentNumber}
              amount={payment.amount}
              customerName={payment.customer.companyName}
            />
          )}
        </div>
      </div>

      {/* Payment and Customer Information Cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Payment Information Card */}
        <Card className="border-green-500/20">
          <CardHeader className="bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Payment Number</p>
                <p className="font-medium">{payment.paymentNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="font-medium">{formatDate(payment.paymentDate)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{getPaymentMethodDisplay(payment.paymentMethod)}</p>
              </div>
            </div>

            {payment.referenceNumber && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-medium">{payment.referenceNumber}</p>
                </div>
              </div>
            )}

            {/* Gateway Details (for credit card payments) */}
            {payment.paymentMethod === "CREDIT_CARD" && (
              <>
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Gateway Details</p>
                  </div>
                </div>

                {payment.gatewayTransactionId && (
                  <div className="pl-7">
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">{payment.gatewayTransactionId}</p>
                  </div>
                )}

                {payment.cardType && (
                  <div className="pl-7">
                    <p className="text-sm text-muted-foreground">Card Type</p>
                    <p className="font-medium">{payment.cardType}</p>
                  </div>
                )}

                {payment.last4Digits && (
                  <div className="pl-7">
                    <p className="text-sm text-muted-foreground">Card Number</p>
                    <p className="font-medium">•••• •••• •••• {payment.last4Digits}</p>
                  </div>
                )}

                {payment.paymentGatewayProvider && (
                  <div className="pl-7">
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">
                      {payment.paymentGatewayProvider === "STRIPE" ? "Stripe" : "Authorize.net"}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer Information Card */}
        <Card className="border-blue-500/20">
          <CardHeader className="bg-gradient-to-r from-blue-500/5 via-transparent to-green-500/5">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <Link
                  href={`/dashboard/clients/${payment.customerId}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {payment.customer.companyName}
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Customer Number</p>
                <p className="font-medium">{payment.customer.customerNumber}</p>
              </div>
            </div>

            {payment.customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${payment.customer.email}`}
                    className="font-medium hover:underline"
                  >
                    {payment.customer.email}
                  </a>
                </div>
              </div>
            )}

            {payment.customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${payment.customer.phone}`}
                    className="font-medium hover:underline"
                  >
                    {payment.customer.phone}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Applied Documents Table */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            Applied to Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-green-500/10">
                  <TableHead>Document Number</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead className="text-right">Document Total</TableHead>
                  <TableHead className="text-right">Amount Applied</TableHead>
                  <TableHead>Applied Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.paymentApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No documents associated with this payment
                    </TableCell>
                  </TableRow>
                ) : (
                  payment.paymentApplications.map((application: any) => (
                    <TableRow key={application.id} className="hover:bg-green-500/5">
                      <TableCell>
                        <Link
                          href={`/dashboard/documents/${application.arDocument.id}`}
                          className="font-medium text-green-600 dark:text-green-400 hover:underline"
                        >
                          {application.arDocument.documentNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {application.arDocument.documentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(application.arDocument.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(application.amountApplied)}
                      </TableCell>
                      <TableCell>{formatDate(application.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
