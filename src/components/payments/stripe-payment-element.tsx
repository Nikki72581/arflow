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
      setError("Payment system not initialized. Please refresh and try again.");
      return;
    }

    setSubmitting(true);

    try {
      // CRITICAL: Submit the elements to ensure payment method is collected
      // This validates the payment details and attaches the payment method
      const { error: submitError } = await elements.submit();

      if (submitError) {
        setError(submitError.message || "Please complete all payment details.");
        setSubmitting(false);
        return;
      }

      // Now confirm the payment with the collected payment method
      const returnUrl = `${window.location.origin}/payment/success`;

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

      if (result.error) {
        // Payment failed - show user-friendly error
        const errorMessage =
          result.error.message || "Payment failed. Please try again.";
        console.error("[Stripe Payment] Confirmation error:", result.error);
        setError(errorMessage);
        setSubmitting(false);
        return;
      }

      // Check payment intent status
      if (result.paymentIntent?.status === "succeeded") {
        console.log(
          "[Stripe Payment] Payment succeeded:",
          result.paymentIntent.id,
        );

        // Immediately verify and apply payment
        try {
          const verifyResponse = await fetch("/api/payments/verify-immediate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentIntentId: result.paymentIntent.id,
            }),
          });

          if (!verifyResponse.ok) {
            console.error(
              "[Stripe Payment] Failed to verify payment immediately",
            );
            // Don't block success - webhook will handle it
          }
        } catch (err) {
          console.error(
            "[Stripe Payment] Failed to immediately verify payment:",
            err,
          );
          // Don't block success - webhook will handle it
        }

        onSuccess?.();
      } else if (result.paymentIntent?.status === "requires_payment_method") {
        setError(
          "Payment method validation failed. Please check your card details and try again.",
        );
        setSubmitting(false);
      } else if (result.paymentIntent?.status === "processing") {
        // Payment is being processed
        console.log(
          "[Stripe Payment] Payment processing:",
          result.paymentIntent.id,
        );
        setError("Payment is being processed. This may take a moment...");
        setSubmitting(false);
      } else if (result.paymentIntent) {
        console.warn(
          "[Stripe Payment] Unexpected status:",
          result.paymentIntent.status,
        );
        setError(
          `Payment status: ${result.paymentIntent.status}. Please contact support if you've been charged.`,
        );
        setSubmitting(false);
      }
    } catch (err) {
      console.error("[Stripe Payment] Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
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
    [publishableKey],
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
