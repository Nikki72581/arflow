"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Users,
  UserPlus,
  UserX,
  RefreshCw,
} from "lucide-react";
import { getAcumaticaIntegration } from "@/actions/integrations/acumatica/connection";
import {
  discoverPaymentMethods,
  savePaymentMethodFilter,
  getPaymentMethodFilter,
  type PaymentMethodInfo,
} from "@/actions/integrations/acumatica/payment-methods";
import {
  getCustomerHandlingSettings,
  updateCustomerHandlingSettings,
} from "@/actions/integrations/acumatica/customer-settings";

type UnmappedAction = "SKIP" | "AUTO_CREATE" | "DEFAULT_USER";

export default function FiltersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment method state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [paymentMethodMode, setPaymentMethodMode] = useState<"ALL" | "SELECTED">("ALL");
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);

  // Customer handling state
  const [customerAction, setCustomerAction] = useState<UnmappedAction>("AUTO_CREATE");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const integration = await getAcumaticaIntegration();
      if (!integration) {
        router.push("/dashboard/integrations/acumatica/setup");
        return;
      }

      if (!integration.dataSourceEntity) {
        router.push("/dashboard/integrations/acumatica/setup/document-type");
        return;
      }

      setIntegrationId(integration.id);

      // Load current payment method filter
      const pmFilter = await getPaymentMethodFilter(integration.id);
      if (pmFilter) {
        setPaymentMethodMode(pmFilter.mode);
        setSelectedPaymentMethods(pmFilter.selectedValues);
      }

      // Load customer handling settings
      const customerSettings = await getCustomerHandlingSettings(integration.id);
      if (customerSettings) {
        setCustomerAction(customerSettings.unmappedCustomerAction);
      }

      // Load payment methods from Acumatica
      await loadPaymentMethods(integration.id);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load integration data");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async (intId: string) => {
    setLoadingPaymentMethods(true);
    try {
      const methods = await discoverPaymentMethods(intId);
      setPaymentMethods(methods);
    } catch (err) {
      console.error("Failed to load payment methods:", err);
      // Don't set error - payment methods are optional
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(methodId)
        ? prev.filter((id) => id !== methodId)
        : [...prev, methodId]
    );
  };

  const handleContinue = async () => {
    if (!integrationId) return;

    setSaving(true);
    setError(null);

    try {
      // Save payment method filter
      await savePaymentMethodFilter(
        integrationId,
        paymentMethodMode,
        selectedPaymentMethods
      );

      // Save customer handling settings
      const result = await updateCustomerHandlingSettings(integrationId, {
        unmappedCustomerAction: customerAction,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save customer settings");
      }

      router.push("/dashboard/integrations/acumatica/setup/preview");
    } catch (err) {
      console.error("Failed to save filters:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save filter settings"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Filter & Customer Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 3 of 4: Configure filters and customer handling
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: "75%" }}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Method Filter */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-indigo-600" />
              <CardTitle>Payment Method Filter</CardTitle>
            </div>
            {integrationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPaymentMethods(integrationId)}
                disabled={loadingPaymentMethods}
              >
                {loadingPaymentMethods ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            Filter documents by their default payment method. Only documents with
            the selected payment methods will be imported.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={paymentMethodMode}
            onValueChange={(v) => setPaymentMethodMode(v as "ALL" | "SELECTED")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ALL" id="pm-all" />
              <Label htmlFor="pm-all" className="cursor-pointer">
                Import all documents (no payment method filter)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SELECTED" id="pm-selected" />
              <Label htmlFor="pm-selected" className="cursor-pointer">
                Only import documents with specific payment methods
              </Label>
            </div>
          </RadioGroup>

          {paymentMethodMode === "SELECTED" && (
            <div className="mt-4 space-y-3">
              {loadingPaymentMethods ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No payment methods found in Acumatica. Make sure payment methods
                    are configured and marked as "Use in AR".
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg divide-y">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`pm-${method.id}`}
                        checked={selectedPaymentMethods.includes(method.id)}
                        onCheckedChange={() => handlePaymentMethodToggle(method.id)}
                      />
                      <Label
                        htmlFor={`pm-${method.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{method.id}</div>
                        {method.description && (
                          <div className="text-sm text-muted-foreground">
                            {method.description}
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {paymentMethodMode === "SELECTED" &&
                selectedPaymentMethods.length === 0 &&
                paymentMethods.length > 0 && (
                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      Please select at least one payment method, or choose "Import
                      all documents" to continue.
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Handling */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <CardTitle>Customer Handling</CardTitle>
          </div>
          <CardDescription>
            Choose how to handle documents from customers that don't exist in ARFlow yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={customerAction}
            onValueChange={(v) => setCustomerAction(v as UnmappedAction)}
          >
            <div className="space-y-4">
              {/* Auto Create */}
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  customerAction === "AUTO_CREATE"
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-border hover:border-purple-500/50"
                }`}
                onClick={() => setCustomerAction("AUTO_CREATE")}
              >
                <RadioGroupItem value="AUTO_CREATE" id="auto-create" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="h-5 w-5 text-emerald-600" />
                    <Label
                      htmlFor="auto-create"
                      className="text-base font-semibold cursor-pointer"
                    >
                      Automatically Create Customers
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When a document is imported for a customer that doesn't exist in ARFlow,
                    automatically create a new customer record using the information from Acumatica.
                  </p>
                </div>
              </div>

              {/* Skip */}
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  customerAction === "SKIP"
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-border hover:border-purple-500/50"
                }`}
                onClick={() => setCustomerAction("SKIP")}
              >
                <RadioGroupItem value="SKIP" id="skip" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <UserX className="h-5 w-5 text-amber-600" />
                    <Label
                      htmlFor="skip"
                      className="text-base font-semibold cursor-pointer"
                    >
                      Skip Unmapped Customers
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Documents from customers that don't exist in ARFlow will be skipped.
                    You'll need to manually create the customer first before their documents can be imported.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push("/dashboard/integrations/acumatica/setup/document-type")
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={
            saving ||
            (paymentMethodMode === "SELECTED" &&
              selectedPaymentMethods.length === 0 &&
              paymentMethods.length > 0)
          }
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue to Preview
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
