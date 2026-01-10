"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { setActiveProvider } from "@/app/actions/payment-gateway-settings";
import type { PaymentGatewayProvider } from "@prisma/client";

interface ProviderStatus {
  configured: boolean;
  enabled: boolean;
  isActive: boolean;
  lastConnectionTest?: Date | null;
  connectionError?: string | null;
  isProduction: boolean;
}

interface PaymentProviderSelectorProps {
  providers: {
    AUTHORIZE_NET: ProviderStatus;
    STRIPE: ProviderStatus;
  };
  activeProvider: PaymentGatewayProvider | null;
}

export function PaymentProviderSelector({
  providers,
  activeProvider,
}: PaymentProviderSelectorProps) {
  const router = useRouter();
  const [activating, setActivating] = useState<string | null>(null);

  async function handleActivate(provider: PaymentGatewayProvider) {
    setActivating(provider);
    try {
      await setActiveProvider(provider);
      router.refresh();
    } catch (error: any) {
      console.error("Failed to activate provider:", error);
      alert(error.message || "Failed to activate provider");
    } finally {
      setActivating(null);
    }
  }

  async function handleDeactivate() {
    setActivating("none");
    try {
      await setActiveProvider(null);
      router.refresh();
    } catch (error: any) {
      console.error("Failed to deactivate provider:", error);
      alert(error.message || "Failed to deactivate provider");
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Authorize.net Card */}
      <Card className={providers.AUTHORIZE_NET.isActive ? "border-green-500 border-2" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Authorize.net</CardTitle>
                <CardDescription>Payment Gateway</CardDescription>
              </div>
            </div>
            {providers.AUTHORIZE_NET.isActive && (
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            {providers.AUTHORIZE_NET.configured ? (
              <Badge variant={providers.AUTHORIZE_NET.enabled ? "success" : "secondary"}>
                {providers.AUTHORIZE_NET.enabled ? "Configured" : "Disabled"}
              </Badge>
            ) : (
              <Badge variant="outline">Not Configured</Badge>
            )}
          </div>

          {providers.AUTHORIZE_NET.lastConnectionTest && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connection:</span>
              {providers.AUTHORIZE_NET.connectionError ? (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Failed</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Success</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push("/dashboard/administration/payment-providers/authorize-net")}
            >
              {providers.AUTHORIZE_NET.configured ? "Manage" : "Configure"}
            </Button>
            {providers.AUTHORIZE_NET.enabled && !providers.AUTHORIZE_NET.isActive && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleActivate("AUTHORIZE_NET")}
                disabled={activating !== null}
              >
                {activating === "AUTHORIZE_NET" ? "Activating..." : "Activate"}
              </Button>
            )}
            {providers.AUTHORIZE_NET.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDeactivate}
                disabled={activating !== null}
              >
                {activating === "none" ? "Deactivating..." : "Deactivate"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Card */}
      <Card className={providers.STRIPE.isActive ? "border-green-500 border-2" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle>Stripe</CardTitle>
                <CardDescription>Payment Platform</CardDescription>
              </div>
            </div>
            {providers.STRIPE.isActive && (
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            {providers.STRIPE.configured ? (
              <Badge variant={providers.STRIPE.enabled ? "success" : "secondary"}>
                {providers.STRIPE.enabled ? "Configured" : "Disabled"}
              </Badge>
            ) : (
              <Badge variant="outline">Not Configured</Badge>
            )}
          </div>

          {providers.STRIPE.lastConnectionTest && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connection:</span>
              {providers.STRIPE.connectionError ? (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Failed</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Success</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push("/dashboard/administration/payment-providers/stripe")}
            >
              {providers.STRIPE.configured ? "Manage" : "Configure"}
            </Button>
            {providers.STRIPE.enabled && !providers.STRIPE.isActive && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleActivate("STRIPE")}
                disabled={activating !== null}
              >
                {activating === "STRIPE" ? "Activating..." : "Activate"}
              </Button>
            )}
            {providers.STRIPE.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDeactivate}
                disabled={activating !== null}
              >
                {activating === "none" ? "Deactivating..." : "Deactivate"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
