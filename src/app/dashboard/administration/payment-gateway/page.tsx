import { Suspense } from "react";
import { getAuthorizeNetSettings } from "@/app/actions/authorize-net";
import { PaymentGatewaySettingsForm } from "@/components/administration/payment-gateway-settings-form";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Payment Gateway Settings | ARFlow",
  description: "Configure Authorize.net payment gateway integration",
};

export default async function PaymentGatewayPage() {
  const settings = await getAuthorizeNetSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Gateway</h1>
        <p className="text-muted-foreground mt-2">
          Configure Authorize.net integration for credit card processing
        </p>
      </div>

      <Suspense fallback={<SettingsSkeleton />}>
        <PaymentGatewaySettingsForm settings={settings} />
      </Suspense>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-64 w-full" />
    </Card>
  );
}
