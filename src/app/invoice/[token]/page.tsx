import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicInvoice } from "@/app/actions/public-invoices";
import { PublicInvoicePayment } from "@/components/payments/public-invoice-payment";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: { token: string };
}

async function PublicInvoiceContent({ token }: { token: string }) {
  const result = await getPublicInvoice(token);

  if (!result.success || !result.data) {
    notFound();
  }

  const invoice = result.data;

  return (
    <PublicInvoicePayment token={token} invoice={invoice} />
  );
}

export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = params;

  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-12 px-4">
          <Skeleton className="h-[800px] w-full" />
        </div>
      }
    >
      <PublicInvoiceContent token={token} />
    </Suspense>
  );
}
