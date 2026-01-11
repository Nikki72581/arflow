import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getPublicInvoice, createPublicInvoiceCheckout } from "@/app/actions/public-invoices";
import { PrintedInvoiceView } from "@/components/documents/printed-invoice-view";
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

  async function handlePayNow() {
    "use server";
    const checkoutResult = await createPublicInvoiceCheckout(token);
    if (checkoutResult.success && checkoutResult.sessionUrl) {
      redirect(checkoutResult.sessionUrl);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <PrintedInvoiceView
        document={invoice as any}
        showPayButton={invoice.canPay}
        onPayClick={handlePayNow}
      />
    </div>
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
