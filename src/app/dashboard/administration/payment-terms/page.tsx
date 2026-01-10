import { Suspense } from "react";
import { getPaymentTermTypes } from "@/app/actions/payment-term-types";
import { PaymentTermsSettingsForm } from "@/components/administration/payment-terms-settings-form";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Payment Terms | ARFlow",
  description: "Manage payment term settings",
};

export default async function PaymentTermsSettingsPage() {
  const terms = await getPaymentTermTypes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Terms</h1>
          <p className="text-muted-foreground">
            Configure payment terms with due dates and early payment discounts
          </p>
        </div>
      </div>

      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <PaymentTermsSettingsForm initialTerms={terms} />
      </Suspense>
    </div>
  );
}

function SettingsLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-8 w-48" />
        </CardTitle>
      </CardHeader>
      <div className="p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </Card>
  );
}
