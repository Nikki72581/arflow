"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DollarSign, CheckCircle2, Lock, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createManualPayment, createStripeCheckoutSession } from "@/app/actions/payments";
import { getActiveProvider } from "@/app/actions/payment-gateway-settings";
import { getStripePublishableKey } from "@/app/actions/stripe";
import { formatCurrency } from "@/lib/utils";
import { PaymentMethod } from "@prisma/client";
import { StripeEmbeddedCheckout } from "./stripe-embedded-checkout";

interface PaymentEntryDialogProps {
  document: any;
  trigger?: React.ReactNode;
}

export function PaymentEntryDialog({ document, trigger }: PaymentEntryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "other">("credit_card");
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [amount, setAmount] = useState(document.balanceDue.toString());

  // Stripe Checkout mode state
  const [checkoutMode, setCheckoutMode] = useState<"pay_now" | "generate_link">("pay_now");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Embedded checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  // Other payment methods state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CHECK");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Check active payment gateway when dialog opens
  useEffect(() => {
    if (open) {
      Promise.all([getActiveProvider(), getStripePublishableKey()]).then(
        ([activeProvider, pubKey]) => {
          const hasActiveProvider = activeProvider !== null;
          setGatewayEnabled(hasActiveProvider);
          if (pubKey) {
            setPublishableKey(pubKey);
          }
          if (!hasActiveProvider) {
            setPaymentMethod("other");
          }
        }
      );
    }
  }, [open]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Handle Stripe Checkout submission
  async function handleCheckoutSubmit() {
    setLoading(true);
    setError(null);

    try {
      const paymentAmount = parseFloat(amount);

      if (paymentAmount <= 0 || paymentAmount > document.balanceDue) {
        throw new Error(
          `Payment amount must be between $0.01 and ${formatCurrency(document.balanceDue)}`
        );
      }

      const result = await createStripeCheckoutSession({
        customerId: document.customerId,
        amount: paymentAmount,
        documentIds: [document.id],
        mode: checkoutMode,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session");
      }

      if (checkoutMode === "pay_now") {
        // Show embedded checkout
        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
          setCheckoutSessionId(result.sessionId || null);
        } else {
          throw new Error("No client secret returned from checkout session");
        }
      } else {
        // Show generated link
        setGeneratedLink(result.sessionUrl!);
        setCheckoutSessionId(result.sessionId || null);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Handle manual payment submission (for "Other Methods" only)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const paymentAmount = parseFloat(amount);

      if (paymentAmount <= 0 || paymentAmount > document.balanceDue) {
        throw new Error(
          `Payment amount must be between $0.01 and ${formatCurrency(document.balanceDue)}`
        );
      }

      // Process manual payment
      const result = await createManualPayment({
        customerId: document.customerId,
        amount: paymentAmount,
        paymentMethod: selectedMethod,
        paymentDate: new Date(),
        referenceNumber: referenceNumber || undefined,
        documentIds: [document.id],
      });

      if (!result.success) {
        throw new Error(result.error || "Payment failed");
      }

      // Show success
      setShowSuccess(true);

      // Wait for animation, then close and refresh
      setTimeout(() => {
        setShowSuccess(false);
        setOpen(false);
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset embedded checkout state
      setClientSecret(null);
      setGeneratedLink(null);
      setError(null);
      setCheckoutSessionId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <DollarSign className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={clientSecret ? "sm:max-w-[800px]" : "sm:max-w-[600px]"}>
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-in zoom-in duration-500">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <p className="mt-4 text-lg font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700">
              Payment Successful!
            </p>
            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Your payment has been processed
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Make a Payment</DialogTitle>
              <DialogDescription>
                Pay {document.documentType.toLowerCase()} {document.documentNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {/* Amount Summary */}
              <div className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Amount Due</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(document.balanceDue)}
                  </span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Payment Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={document.balanceDue}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9 text-lg font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="credit_card" disabled={!gatewayEnabled}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Credit Card
                  </TabsTrigger>
                  <TabsTrigger value="other">
                    Other Methods
                  </TabsTrigger>
                </TabsList>

                {/* Credit Card Tab - Stripe Checkout */}
                <TabsContent value="credit_card" className="space-y-4 mt-4">
                  {!gatewayEnabled && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Credit Card Processing Disabled</AlertTitle>
                      <AlertDescription>
                        Credit card processing is not enabled. Please contact your administrator.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Show Embedded Checkout when client secret is available */}
                  {gatewayEnabled && clientSecret && publishableKey && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div>
                          <h3 className="text-lg font-semibold">Complete Your Payment</h3>
                          <p className="text-sm text-muted-foreground">
                            Securely pay {formatCurrency(parseFloat(amount))} with your card
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setClientSecret(null)}
                        >
                          Back
                        </Button>
                      </div>
                      <StripeEmbeddedCheckout
                        clientSecret={clientSecret}
                        publishableKey={publishableKey}
                        onComplete={() => {
                          if (checkoutSessionId) {
                            router.push(
                              `/payment/success?session_id=${checkoutSessionId}`
                            );
                          }
                        }}
                      />
                    </div>
                  )}

                  {gatewayEnabled && !generatedLink && !clientSecret && (
                    <>
                      {/* Payment Mode Selection */}
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Select Payment Method</Label>
                        <RadioGroup value={checkoutMode} onValueChange={(v) => setCheckoutMode(v as "pay_now" | "generate_link")}>
                          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            <RadioGroupItem value="pay_now" id="pay_now" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="pay_now" className="cursor-pointer font-semibold">
                                Pay Now
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Complete payment immediately using Stripe's secure embedded checkout
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            <RadioGroupItem value="generate_link" id="generate_link" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="generate_link" className="cursor-pointer font-semibold">
                                Generate Payment Link
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Create a secure payment link to send to customer via email or copy
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Action Button */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpen(false)}
                          disabled={loading}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCheckoutSubmit}
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? (
                            "Processing..."
                          ) : checkoutMode === "pay_now" ? (
                            <>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Proceed to Checkout
                            </>
                          ) : (
                            "Generate Payment Link"
                          )}
                        </Button>
                      </div>

                      {/* Security Badge */}
                      <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-900 dark:text-green-100 font-medium">
                          Secure payment powered by Stripe
                        </span>
                      </div>
                    </>
                  )}

                  {/* Generated Link Display */}
                  {generatedLink && (
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Payment Link Generated</AlertTitle>
                        <AlertDescription>
                          This link is valid for 24 hours. Send it to your customer via email or copy to clipboard.
                        </AlertDescription>
                      </Alert>

                      <div className="p-4 bg-muted rounded-lg border">
                        <p className="text-sm font-medium mb-2">Payment Link:</p>
                        <p className="text-xs font-mono break-all text-muted-foreground">
                          {generatedLink}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => copyToClipboard(generatedLink)}
                          className="flex-1"
                        >
                          {copySuccess ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setGeneratedLink(null);
                            setOpen(false);
                            router.refresh();
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Other Methods Tab */}
                <TabsContent value="other" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHECK">Check</SelectItem>
                        <SelectItem value="WIRE">Wire Transfer</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referenceNumber">
                      Reference Number
                      {selectedMethod === "CHECK" && " (Check #)"}
                      {selectedMethod === "WIRE" && " (Wire Confirmation)"}
                    </Label>
                    <Input
                      id="referenceNumber"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder={
                        selectedMethod === "CHECK"
                          ? "Check number"
                          : selectedMethod === "WIRE"
                          ? "Wire confirmation number"
                          : "Reference number"
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Submit buttons - only shown for "Other Methods" tab */}
            {paymentMethod === "other" && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Processing..." : `Pay ${formatCurrency(parseFloat(amount) || 0)}`}
                </Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
