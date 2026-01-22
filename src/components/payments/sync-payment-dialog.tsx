"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CloudUpload,
} from "lucide-react";
import {
  syncPaymentToAcumatica,
  checkPaymentSyncEligibility,
} from "@/actions/integrations/acumatica/sync-payment";
import { useAppToast } from "@/hooks/use-app-toast";

interface SyncPaymentDialogProps {
  paymentId: string;
  paymentNumber: string;
  amount: number;
  customerName: string;
  currentSyncStatus?: string | null;
  trigger?: React.ReactNode;
}

export function SyncPaymentDialog({
  paymentId,
  paymentNumber,
  amount,
  customerName,
  currentSyncStatus,
  trigger,
}: SyncPaymentDialogProps) {
  const router = useRouter();
  const toast = useAppToast();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);

  const isRetry = currentSyncStatus === "failed";

  async function checkEligibility() {
    setChecking(true);
    try {
      const result = await checkPaymentSyncEligibility(paymentId);
      setEligibility(result);
    } catch (error: any) {
      toast.error(
        "Failed to check eligibility",
        error?.message || "Please try again",
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncPaymentToAcumatica(paymentId, "MANUAL");

      if (!result.success) {
        toast.error(
          "Sync failed",
          result.error || "Failed to sync payment to Acumatica",
        );
        // Keep dialog open to show error
        return;
      }

      toast.success(
        "Payment synced successfully",
        `Acumatica Payment: ${result.acumaticaPaymentRef}`,
      );

      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(
        "Sync failed",
        error?.message || "An unexpected error occurred",
      );
    } finally {
      setSyncing(false);
    }
  }

  // Check eligibility when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !eligibility) {
      checkEligibility();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <CloudUpload className="mr-2 h-4 w-4" />
            {isRetry ? "Retry Sync" : "Sync to Acumatica"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            {isRetry ? "Retry Sync to Acumatica" : "Sync Payment to Acumatica"}
          </DialogTitle>
          <DialogDescription>
            {isRetry
              ? "Retry syncing this payment to Acumatica as an AR Payment."
              : "Sync this payment to Acumatica as an AR Payment record."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Payment Number:
              </span>
              <span className="text-sm font-medium">{paymentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer:</span>
              <span className="text-sm font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="text-sm font-medium">
                $
                {amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Eligibility Check */}
          {checking && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">
                Checking eligibility...
              </span>
            </div>
          )}

          {eligibility && !checking && (
            <>
              {eligibility.eligible ? (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    This payment is ready to sync to Acumatica.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      Cannot sync this payment:
                    </p>
                    <p className="text-sm">{eligibility.reason}</p>
                    {eligibility.details?.documentsWithoutExternalIds && (
                      <div className="mt-2 text-sm">
                        <p className="font-medium">Documents not synced:</p>
                        <ul className="list-disc list-inside mt-1">
                          {eligibility.details.documentsWithoutExternalIds.map(
                            (doc: string) => (
                              <li key={doc}>{doc}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={syncing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSync}
            disabled={
              syncing || checking || (eligibility && !eligibility.eligible)
            }
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CloudUpload className="mr-2 h-4 w-4" />
                {isRetry ? "Retry Sync" : "Sync to Acumatica"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
