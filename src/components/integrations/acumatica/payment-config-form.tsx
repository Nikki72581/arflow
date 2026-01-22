"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw } from "lucide-react";
import {
  fetchAcumaticaPaymentMethods,
  fetchAcumaticaCashAccounts,
  savePaymentConfiguration,
  type PaymentMethodOption,
  type CashAccountOption,
  type PaymentConfigSettings,
} from "@/actions/integrations/acumatica/payment-config";

interface PaymentConfigFormProps {
  integrationId: string;
  initialSettings: PaymentConfigSettings | null;
}

export function PaymentConfigForm({
  integrationId,
  initialSettings,
}: PaymentConfigFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccountOption[]>([]);

  const [formData, setFormData] = useState({
    defaultPaymentMethod: initialSettings?.defaultPaymentMethod || "",
    defaultCashAccount: initialSettings?.defaultCashAccount || "",
    autoSyncPayments: initialSettings?.autoSyncPayments || false,
  });

  // Fetch options on mount
  useEffect(() => {
    fetchOptions();
  }, [integrationId]);

  async function fetchOptions() {
    setFetchingOptions(true);
    setError(null);

    try {
      // Fetch both in parallel
      const [paymentMethodsResult, cashAccountsResult] = await Promise.all([
        fetchAcumaticaPaymentMethods(integrationId),
        fetchAcumaticaCashAccounts(integrationId),
      ]);

      if (!paymentMethodsResult.success) {
        setError(paymentMethodsResult.error || "Failed to fetch payment methods");
        return;
      }

      if (!cashAccountsResult.success) {
        setError(cashAccountsResult.error || "Failed to fetch cash accounts");
        return;
      }

      setPaymentMethods(paymentMethodsResult.paymentMethods || []);
      setCashAccounts(cashAccountsResult.cashAccounts || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch options from Acumatica");
    } finally {
      setFetchingOptions(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.defaultPaymentMethod || !formData.defaultCashAccount) {
        throw new Error("Please select both a payment method and cash account");
      }

      const result = await savePaymentConfiguration(integrationId, {
        defaultPaymentMethod: formData.defaultPaymentMethod,
        defaultCashAccount: formData.defaultCashAccount,
        autoSyncPayments: formData.autoSyncPayments,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save settings");
      }

      setSuccess("Payment configuration saved successfully");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  const isConfigured = formData.defaultPaymentMethod && formData.defaultCashAccount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Sync Configuration
            </CardTitle>
            <CardDescription>
              Configure how payments are synced to Acumatica as AR Payment records
            </CardDescription>
          </div>
          {isConfigured && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Configured</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-900 dark:text-green-100">
                  {success}
                </p>
              </div>
            </div>
          )}

          {fetchingOptions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading options from Acumatica...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchOptions}
                  disabled={fetchingOptions}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh Options
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">
                  Acumatica Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.defaultPaymentMethod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, defaultPaymentMethod: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No payment methods available
                      </SelectItem>
                    ) : (
                      paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.id}>
                          {pm.id} - {pm.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The payment method to use when creating AR Payment records in Acumatica
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cashAccount">
                  Acumatica Cash Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.defaultCashAccount}
                  onValueChange={(value) =>
                    setFormData({ ...formData, defaultCashAccount: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select cash account" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No cash accounts available
                      </SelectItem>
                    ) : (
                      cashAccounts.map((ca) => (
                        <SelectItem key={ca.id} value={ca.id}>
                          {ca.id} - {ca.description}
                          {ca.branch && ` (${ca.branch})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The cash account to deposit payments into in Acumatica
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="autoSyncPayments" className="cursor-pointer">
                    Auto-Sync Payments
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync payments to Acumatica when they are created
                  </p>
                </div>
                <Switch
                  id="autoSyncPayments"
                  checked={formData.autoSyncPayments}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoSyncPayments: checked })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || fetchingOptions || !paymentMethods.length || !cashAccounts.length}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
