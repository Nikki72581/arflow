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
  upsertStripeSettings,
  testStripeConnection,
  toggleStripeEnabled,
} from "@/app/actions/stripe";
import { formatDate } from "@/lib/utils";

interface StripeSettingsFormProps {
  settings: any | null;
}

export function StripeSettingsForm({ settings }: StripeSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    secretKey: "",
    publishableKey: "",
    webhookSecret: "",
    isProduction: settings?.isProduction || false,
    requireCVV: settings?.requireCVV ?? true,
    requireBillingAddress: settings?.requireBillingAddress ?? true,
    autoCreateWebhook: true, // Default to true for convenience
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.secretKey || !formData.publishableKey) {
        throw new Error("Secret Key and Publishable Key are required");
      }

      const result = await upsertStripeSettings(formData);

      // Build success message based on webhook creation result
      let successMessage = "Settings saved successfully";
      if (result.webhookCreated) {
        successMessage += ". Webhook endpoint created automatically in Stripe!";
      } else if (result.webhookError) {
        successMessage += `. Note: Webhook creation failed (${result.webhookError}). You can add it manually in Stripe Dashboard.`;
      }

      setSuccess(successMessage);
      router.refresh();

      // Clear the sensitive fields for security
      setFormData({
        ...formData,
        secretKey: "",
        publishableKey: "",
        webhookSecret: "",
      });
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
      const result = await testStripeConnection();
      if (result.success) {
        setSuccess("Connection test successful!");
      } else {
        setError(result.error || "Connection test failed");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleToggleEnabled(enabled: boolean) {
    try {
      await toggleStripeEnabled(enabled);
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
                Stripe Integration Status
              </CardTitle>
              <CardDescription>
                Stripe payment processing integration
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
            Configure your Stripe API credentials. You can find these in your
            Stripe Dashboard under Developers → API keys.
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
                <Label htmlFor="secretKey">
                  Secret Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) =>
                    setFormData({ ...formData, secretKey: e.target.value })
                  }
                  placeholder={settings ? "sk_test_... or sk_live_... (enter new to update)" : "sk_test_... or sk_live_..."}
                  required={!settings}
                />
                {settings && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing key
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="publishableKey">
                  Publishable Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="publishableKey"
                  type="text"
                  value={formData.publishableKey}
                  onChange={(e) =>
                    setFormData({ ...formData, publishableKey: e.target.value })
                  }
                  placeholder={settings ? "pk_test_... or pk_live_... (enter new to update)" : "pk_test_... or pk_live_..."}
                  required={!settings}
                />
                {settings && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing key
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="webhookSecret">
                  Webhook Signing Secret (Optional)
                </Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  value={formData.webhookSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, webhookSecret: e.target.value })
                  }
                  placeholder="whsec_... (for webhook verification)"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-create webhook, or enter manually if you already created one in Stripe Dashboard.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCreateWebhook" className="cursor-pointer">
                    Auto-Create Webhook Endpoint
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create webhook endpoint in your Stripe account (recommended)
                  </p>
                </div>
                <Switch
                  id="autoCreateWebhook"
                  checked={formData.autoCreateWebhook}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoCreateWebhook: checked })
                  }
                  disabled={!!formData.webhookSecret}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isProduction" className="cursor-pointer">
                    Live Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use live API keys for real transactions
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

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
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
              Always use test mode keys (sk_test_...) while setting up and testing your integration.
              Switch to live mode only when you're ready to process real transactions.
            </p>
            <p>
              Never share your Secret Key with anyone. The Publishable Key can be safely used in
              client-side code.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <CheckCircle2 className="h-5 w-5" />
              Automatic Webhook Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-800 dark:text-green-200 space-y-2">
            <p>
              When you enable "Auto-Create Webhook Endpoint", we'll automatically create a webhook
              endpoint in your Stripe account pointing to your application.
            </p>
            <p>
              This eliminates the need to manually configure webhooks in the Stripe Dashboard.
              The webhook secret will be saved automatically.
            </p>
            <p>
              <strong>Requirements:</strong> NEXT_PUBLIC_APP_URL must be set in your environment
              variables for automatic webhook creation to work.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
