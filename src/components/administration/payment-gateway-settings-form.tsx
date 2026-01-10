"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, CreditCard, Shield } from "lucide-react";
import {
  upsertAuthorizeNetSettings,
  testAuthorizeNetConnection,
  toggleAuthorizeNetEnabled,
} from "@/app/actions/authorize-net";
import { formatDate } from "@/lib/utils";

interface PaymentGatewaySettingsFormProps {
  settings: any | null;
}

export function PaymentGatewaySettingsForm({ settings }: PaymentGatewaySettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    apiLoginId: settings?.apiLoginId || "",
    transactionKey: "",
    isProduction: settings?.isProduction || false,
    requireCVV: settings?.requireCVV ?? true,
    requireBillingAddress: settings?.requireBillingAddress ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.apiLoginId || !formData.transactionKey) {
        throw new Error("API Login ID and Transaction Key are required");
      }

      await upsertAuthorizeNetSettings(formData);
      setSuccess("Settings saved successfully");
      router.refresh();

      // Clear the transaction key field for security
      setFormData({ ...formData, transactionKey: "" });
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      await testAuthorizeNetConnection();
      setSuccess("Connection test successful!");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleToggleEnabled(enabled: boolean) {
    try {
      await toggleAuthorizeNetEnabled(enabled);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Gateway Status
              </CardTitle>
              <CardDescription>
                Authorize.net payment processing integration
              </CardDescription>
            </div>
            {settings && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={handleToggleEnabled}
                />
                <Badge variant={settings.enabled ? "success" : "secondary"}>
                  {settings.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.lastConnectionTest && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Last Connection Test</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(settings.lastConnectionTest)}
                </p>
              </div>
              {settings.connectionErrorMessage ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Failed</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Success</span>
                </div>
              )}
            </div>
          )}

          {settings?.connectionErrorMessage && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">Connection Error</p>
              <p className="text-sm text-destructive/80 mt-1">
                {settings.connectionErrorMessage}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>
            Configure your Authorize.net API credentials. You can find these in your
            Authorize.net merchant account under Account → Settings → API Credentials &
            Keys.
          </CardDescription>
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
                  <p className="text-sm text-green-900 dark:text-green-100">{success}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="apiLoginId">
                  API Login ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apiLoginId"
                  type="text"
                  value={formData.apiLoginId}
                  onChange={(e) =>
                    setFormData({ ...formData, apiLoginId: e.target.value })
                  }
                  placeholder="Enter your API Login ID"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transactionKey">
                  Transaction Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="transactionKey"
                  type="password"
                  value={formData.transactionKey}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionKey: e.target.value })
                  }
                  placeholder={settings ? "Enter new key to update" : "Enter your Transaction Key"}
                  required={!settings}
                />
                {settings && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing key
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isProduction" className="cursor-pointer">
                    Production Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use production API endpoint for live transactions
                  </p>
                </div>
                <Switch
                  id="isProduction"
                  checked={formData.isProduction}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isProduction: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="requireCVV" className="cursor-pointer">
                    Require CVV
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require card verification value for all transactions
                  </p>
                </div>
                <Switch
                  id="requireCVV"
                  checked={formData.requireCVV}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requireCVV: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="requireBillingAddress" className="cursor-pointer">
                    Require Billing Address
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require billing address for all transactions
                  </p>
                </div>
                <Switch
                  id="requireBillingAddress"
                  checked={formData.requireBillingAddress}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requireBillingAddress: checked })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Settings"}
              </Button>
              {settings && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Shield className="h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            Your API credentials are encrypted before being stored in the database.
          </p>
          <p>
            Always use test mode (sandbox) while setting up and testing your integration.
            Switch to production mode only when you're ready to process live transactions.
          </p>
          <p>
            Never share your API Login ID or Transaction Key with anyone outside your
            organization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
