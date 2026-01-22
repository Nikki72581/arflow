"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface StripePaymentElementProps {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  onSuccess?: () => void;
}

function StripePaymentElementForm({
  amount,
  onSuccess,
}: Pick<StripePaymentElementProps, "amount" | "onSuccess">) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);

    const returnUrl = `${window.location.origin}/payment/success`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      // Immediately apply payment or trigger processing
      try {
        await fetch('/api/payments/verify-immediate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: result.paymentIntent.id,
          }),
        });
      } catch (err) {
        console.error('Failed to immediately verify payment:', err);
      }
      onSuccess?.();
    } else if (result.paymentIntent?.status === "requires_payment_method") {
      setError("Payment method required. Please try again.");
    } else if (result.paymentIntent) {
      setError(`Payment status: ${result.paymentIntent.status}. Please contact support.`);
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${formatCurrency(amount)}`
        )}
      </Button>
    </form>
  );
}

export function StripePaymentElement({
  clientSecret,
  publishableKey,
  amount,
  onSuccess,
}: StripePaymentElementProps) {
  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey]
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <StripePaymentElementForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}
