import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPaymentById } from "@/app/actions/payments";
import { PaymentDetailView } from "@/components/payments/payment-detail-view";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Payment Details | ARFlow",
  description: "View payment details",
};

export default async function PaymentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const payment = await getPaymentById(params.id);

  if (!payment) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PaymentDetailSkeleton />}>
        <PaymentDetailView payment={payment} />
      </Suspense>
    </div>
  );
}

function PaymentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
      <Card className="p-6">
        <Skeleton className="h-64 w-full" />
      </Card>
    </div>
  );
}
