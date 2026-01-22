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

// Version marker for deployment verification
console.log(
  "[StripePaymentElement] Module loaded - Version 2.0 with enhanced debugging",
);

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
  const [elementReady, setElementReady] = useState(false);

  useEffect(() => {
    console.log("[StripePaymentElement] Component mounted", {
      stripeLoaded: !!stripe,
      elementsLoaded: !!elements,
      amount,
    });
  }, [stripe, elements, amount]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    console.log("[StripePaymentElement] Form submitted", {
      stripeLoaded: !!stripe,
      elementsLoaded: !!elements,
      elementReady,
      amount,
    });

    if (!stripe || !elements) {
      const errorMsg =
        "Payment system not initialized. Please refresh and try again.";
      console.error("[StripePaymentElement] Missing stripe or elements:", {
        stripe: !!stripe,
        elements: !!elements,
      });
      setError(errorMsg);
      return;
    }

    setSubmitting(true);

    try {
      // CRITICAL: Submit the elements to ensure payment method is collected
      // This validates the payment details and attaches the payment method
      console.log(
        "[Stripe Payment] Submitting elements to collect payment method...",
      );
      const submitResult = await elements.submit();

      console.log("[Stripe Payment] Elements submit result:", {
        hasError: !!submitResult.error,
        errorMessage: submitResult.error?.message,
      });

      if (submitResult.error) {
        const errorMsg =
          submitResult.error.message || "Please complete all payment details.";
        console.error("[Stripe Payment] Submit error:", submitResult.error);
        setError(errorMsg);
        setSubmitting(false);
        return;
      }

      // Now confirm the payment with the collected payment method
      const returnUrl = `${window.location.origin}/payment/success`;

      console.log(
        "[Stripe Payment] Confirming payment with return URL:",
        returnUrl,
      );

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

      console.log("[Stripe Payment] Confirm result:", {
        hasError: !!result.error,
        hasPaymentIntent: !!result.paymentIntent,
        paymentIntentStatus: result.paymentIntent?.status,
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

        // Add a small delay so logs are visible
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(
          "[Stripe Payment] Calling onSuccess callback - dialog will close",
        );
        onSuccess?.();
      } else if (result.paymentIntent?.status === "requires_payment_method") {
        console.error(
          "[Stripe Payment] CRITICAL: Payment requires payment method - this means the payment method was NOT attached!",
          result.paymentIntent,
        );
        setError(
          "Payment method validation failed. Please check your card details and try again.",
        );
        setSubmitting(false);

        // DON'T close dialog - keep it open to see error
        return;
      } else if (result.paymentIntent?.status === "processing") {
        // Payment is being processed
        console.log(
          "[Stripe Payment] Payment processing:",
          result.paymentIntent.id,
        );
        setError("Payment is being processed. This may take a moment...");
        setSubmitting(false);

        // DON'T close dialog - wait for webhook
        return;
      } else if (result.paymentIntent) {
        console.error(
          "[Stripe Payment] UNEXPECTED STATUS:",
          result.paymentIntent.status,
          result.paymentIntent,
        );
        setError(
          `Payment status: ${result.paymentIntent.status}. Please contact support if you've been charged.`,
        );
        setSubmitting(false);

        // DON'T close dialog
        return;
      }
    } catch (err) {
      console.error("[Stripe Payment] Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);

      // DON'T close dialog on error
      return;
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => {
          console.log("[StripePaymentElement] PaymentElement ready");
          setElementReady(true);
        }}
        onChange={(event) => {
          console.log("[StripePaymentElement] PaymentElement changed:", {
            complete: event.complete,
            empty: event.empty,
          });
          if (event.complete) {
            setError(null);
          }
        }}
      />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <Button
        type="button"
        disabled={!stripe || !elements || submitting || !elementReady}
        className="w-full"
        onClick={(e) => {
          console.log("[StripePaymentElement] PAY BUTTON CLICKED", {
            stripe: !!stripe,
            elements: !!elements,
            submitting,
            elementReady,
          });
          e.preventDefault();
          e.stopPropagation();
          handleSubmit(e as any);
        }}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : !elementReady ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading payment form...
          </>
        ) : (
          `Pay ${formatCurrency(amount)}`
        )}
      </Button>
    </div>
  );
}

export function StripePaymentElement({
  clientSecret,
  publishableKey,
  amount,
  onSuccess,
}: StripePaymentElementProps) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    console.log(
      "[StripePaymentElement] Loading Stripe with publishable key:",
      publishableKey ? `${publishableKey.substring(0, 20)}...` : "MISSING",
    );

    if (!publishableKey) {
      setLoadError("Stripe publishable key is missing");
      return Promise.resolve(null);
    }

    return loadStripe(publishableKey)
      .then((stripe) => {
        console.log("[StripePaymentElement] Stripe loaded:", !!stripe);
        return stripe;
      })
      .catch((err) => {
        console.error("[StripePaymentElement] Failed to load Stripe:", err);
        setLoadError("Failed to load payment system");
        return null;
      });
  }, [publishableKey]);

  useEffect(() => {
    console.log("[StripePaymentElement] Initializing with:", {
      hasClientSecret: !!clientSecret,
      hasPublishableKey: !!publishableKey,
      amount,
    });
    setReady(true);
  }, [clientSecret, publishableKey, amount]);

  if (loadError) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clientSecret) {
    console.error("[StripePaymentElement] Missing client secret");
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">
            Payment session not initialized. Please try again.
          </p>
        </div>
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
