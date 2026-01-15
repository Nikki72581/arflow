"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { PrintedInvoiceView } from "@/components/documents/printed-invoice-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createPublicInvoicePaymentIntent } from "@/app/actions/public-invoices";
import { StripePaymentElement } from "@/components/payments/stripe-payment-element";
import { formatCurrency } from "@/lib/utils";

interface PublicInvoicePaymentProps {
  token: string;
  invoice: any;
}

export function PublicInvoicePayment({ token, invoice }: PublicInvoicePaymentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePayNow = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createPublicInvoicePaymentIntent(token);
      if (!result.success || !result.clientSecret || !result.publishableKey) {
        throw new Error(result.error || "Unable to start payment");
      }

      setClientSecret(result.clientSecret);
      setPublishableKey(result.publishableKey);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      {error && (
        <div className="max-w-5xl mx-auto mb-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <PrintedInvoiceView
        document={invoice as any}
        showPayButton={!clientSecret && invoice.canPay}
        onPayClick={handlePayNow}
      />

      {clientSecret && publishableKey && !showSuccess && (
        <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Pay {formatCurrency(invoice.balanceDue)}</h2>
              <p className="text-sm text-muted-foreground">
                Secure card payment powered by Stripe
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setClientSecret(null);
                setPublishableKey(null);
              }}
            >
              Back
            </Button>
          </div>

          <StripePaymentElement
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            amount={invoice.balanceDue}
            onSuccess={() => {
              setShowSuccess(true);
              setTimeout(() => router.refresh(), 1500);
            }}
          />
        </div>
      )}

      {loading && (
        <div className="max-w-5xl mx-auto mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing secure payment...
        </div>
      )}

      {showSuccess && (
        <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-900 shadow-lg rounded-lg p-8 text-center">
          <div className="flex justify-center mb-3">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <p className="text-lg font-semibold">Payment submitted</p>
          <p className="text-sm text-muted-foreground">
            We are confirming your payment. This page will refresh shortly.
          </p>
        </div>
      )}
    </div>
  );
}
