import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { verifyCheckoutSession } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  searchParams: { session_id?: string };
}

async function PaymentSuccessContent({ sessionId }: { sessionId: string }) {
  const result = await verifyCheckoutSession(sessionId);

  if (!result.success) {
    if (result.pending) {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="text-center space-y-6">
            <div className="animate-pulse">
              <div className="h-16 w-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Processing Payment...</h1>
            <p className="text-muted-foreground">
              Your payment is being processed. This usually takes just a few seconds.
            </p>
            <p className="text-sm text-muted-foreground">
              Please wait or refresh the page in a moment.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Alert variant="destructive">
          <AlertDescription>{result.error || "Payment not found"}</AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="animate-in zoom-in duration-500">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Success Message */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground mt-2">
            Your payment of {formatCurrency(result.amount!)} has been processed successfully.
          </p>
        </div>

        {/* Payment Details Card */}
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <CardHeader>
            <CardTitle className="text-xl">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Payment Number</p>
                <p className="font-semibold">{result.paymentNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold">{formatCurrency(result.amount!)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-semibold">{result.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-xs">{result.transactionId}</p>
              </div>
            </div>

            {/* Applied Documents */}
            {result.documents && result.documents.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Applied to {result.documents.length}{" "}
                  {result.documents.length === 1 ? "document" : "documents"}:
                </p>
                <div className="space-y-2">
                  {result.documents?.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span>
                        {doc.documentType} {doc.documentNumber}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(doc.amountApplied)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <Link href="/dashboard/documents">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              View Documents
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage({ searchParams }: PageProps) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Alert variant="destructive">
          <AlertDescription>
            No session ID provided. Please check your payment link.
          </AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <div className="animate-pulse">
            <div className="h-16 w-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="mt-4 h-8 bg-gray-200 dark:bg-gray-800 rounded w-64 mx-auto" />
          </div>
        </div>
      }
    >
      <PaymentSuccessContent sessionId={sessionId} />
    </Suspense>
  );
}
