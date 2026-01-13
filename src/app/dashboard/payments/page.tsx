import { Suspense } from "react";
import { PaymentsTable } from "@/components/payments/payments-table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Payments | ARFlow",
  description: "View and manage customer payments",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            View and manage customer payments
          </p>
        </div>
      </div>

      <Suspense fallback={<PaymentsLoadingSkeleton />}>
        <PaymentsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function PaymentsLoadingSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-64 w-full" />
    </Card>
  );
}
