import { Suspense } from "react";
import Link from "next/link";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { markSessionCancelled } from "@/app/actions/payments";

interface PageProps {
  searchParams: { session_id?: string };
}

async function PaymentCancelContent({ sessionId }: { sessionId: string }) {
  // Mark the session as cancelled
  await markSessionCancelled(sessionId);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center space-y-6">
        {/* Cancel Icon */}
        <div className="animate-in zoom-in duration-500">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Cancel Message */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground mt-2">
            Your payment was cancelled. No charges have been made to your account.
          </p>
        </div>

        {/* Information Card */}
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <CardHeader>
            <CardTitle className="text-xl">What Happened?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <p className="text-sm text-muted-foreground">
              You chose to cancel the payment or the payment session expired. This is completely
              safe and no payment has been processed.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Need to make a payment?</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Return to the dashboard and select the document you want to pay</li>
                <li>Click "Make Payment" to start a new payment session</li>
                <li>Or contact your account manager for assistance</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <Link href="/dashboard/documents">
            <Button>
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
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

export default function PaymentCancelPage({ searchParams }: PageProps) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Alert>
          <AlertDescription>
            No session information found. You may have already cancelled this payment.
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
      <PaymentCancelContent sessionId={sessionId} />
    </Suspense>
  );
}
