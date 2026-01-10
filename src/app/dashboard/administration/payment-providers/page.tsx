import { Metadata } from "next";
import { getProviderStatuses } from "@/app/actions/payment-gateway-settings";
import { PaymentProviderSelector } from "@/components/administration/payment-provider-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Providers",
  description: "Manage payment gateway integrations",
};

export default async function PaymentProvidersPage() {
  const providerData = await getProviderStatuses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Payment Providers
        </h1>
        <p className="text-muted-foreground">
          Configure and manage payment gateway integrations for processing credit card payments
        </p>
      </div>

      {/* Active Provider Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active Payment Provider
          </CardTitle>
          <CardDescription>
            Currently processing payments through
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providerData.activeProvider ? (
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-lg">
                  {providerData.activeProvider === "AUTHORIZE_NET" ? "Authorize.net" : "Stripe"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {providerData.providers[providerData.activeProvider].isProduction
                    ? "Live Mode"
                    : "Test Mode"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No active provider. Please configure and activate a payment gateway below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Providers</h2>
        <PaymentProviderSelector
          providers={providerData.providers}
          activeProvider={providerData.activeProvider}
        />
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            Only one payment provider can be active at a time. All credit card transactions will be
            processed through the active provider.
          </p>
          <p>
            You can switch between providers at any time, but make sure to test the connection
            before activating a provider.
          </p>
          <p>
            Always start with test/sandbox mode and verify your integration is working correctly
            before switching to production/live mode.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
