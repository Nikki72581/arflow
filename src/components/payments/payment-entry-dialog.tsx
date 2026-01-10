"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DollarSign, CheckCircle2, Lock, AlertCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { createManualPayment, processCreditCardPayment } from "@/app/actions/payments";
import { getAuthorizeNetSettings } from "@/app/actions/authorize-net";
import { formatCurrency } from "@/lib/utils";
import { PaymentMethod } from "@prisma/client";

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

  // Credit card form state
  const [cardNumber, setCardNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  // Billing address state
  const [billingAddress, setBillingAddress] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  // Other payment methods state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CHECK");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Check gateway settings when dialog opens
  useEffect(() => {
    if (open) {
      getAuthorizeNetSettings().then((settings) => {
        setGatewayEnabled(settings?.enabled || false);
        if (!settings?.enabled) {
          setPaymentMethod("other");
        }
      });
    }
  }, [open]);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  // Format expiration date as MM/YY
  const formatExpirationDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + (v.length > 2 ? "/" + v.slice(2, 4) : "");
    }
    return v;
  };

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

      if (paymentMethod === "credit_card") {
        // Process credit card payment
        const cardNumberClean = cardNumber.replace(/\s/g, "");
        const expirationMMYY = expirationDate.replace("/", "");

        const result = await processCreditCardPayment({
          customerId: document.customerId,
          amount: paymentAmount,
          paymentMethod: "CREDIT_CARD",
          paymentDate: new Date(),
          documentIds: [document.id],
          cardNumber: cardNumberClean,
          expirationDate: expirationMMYY,
          cvv: cvv,
          billingAddress: billingAddress.firstName
            ? billingAddress
            : undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Payment failed");
        }
      } else {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="sm:max-w-[600px]">
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

                {/* Credit Card Tab */}
                <TabsContent value="credit_card" className="space-y-4 mt-4">
                  {!gatewayEnabled && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        Credit card processing is not enabled. Please contact your administrator.
                      </p>
                    </div>
                  )}

                  {gatewayEnabled && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="expirationDate">Expiration Date</Label>
                          <Input
                            id="expirationDate"
                            type="text"
                            value={expirationDate}
                            onChange={(e) => setExpirationDate(formatExpirationDate(e.target.value))}
                            placeholder="MM/YY"
                            maxLength={5}
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <div className="relative">
                            <Input
                              id="cvv"
                              type="text"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                              placeholder="123"
                              maxLength={4}
                              required
                            />
                            <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>

                      {/* Billing Address */}
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-3">Billing Address</h4>
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                value={billingAddress.firstName}
                                onChange={(e) =>
                                  setBillingAddress({ ...billingAddress, firstName: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input
                                id="lastName"
                                value={billingAddress.lastName}
                                onChange={(e) =>
                                  setBillingAddress({ ...billingAddress, lastName: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="address">Street Address</Label>
                            <Input
                              id="address"
                              value={billingAddress.address}
                              onChange={(e) =>
                                setBillingAddress({ ...billingAddress, address: e.target.value })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                value={billingAddress.city}
                                onChange={(e) =>
                                  setBillingAddress({ ...billingAddress, city: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="state">State</Label>
                              <Input
                                id="state"
                                value={billingAddress.state}
                                onChange={(e) =>
                                  setBillingAddress({ ...billingAddress, state: e.target.value })
                                }
                                maxLength={2}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="zip">ZIP</Label>
                              <Input
                                id="zip"
                                value={billingAddress.zip}
                                onChange={(e) =>
                                  setBillingAddress({ ...billingAddress, zip: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
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

              {/* Security Badge */}
              {paymentMethod === "credit_card" && gatewayEnabled && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <Lock className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-900 dark:text-green-100 font-medium">
                    Secure SSL Encrypted Payment
                  </span>
                </div>
              )}
            </div>

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
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
