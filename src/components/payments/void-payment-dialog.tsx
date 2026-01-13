"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";
import { voidPayment } from "@/app/actions/payments";
import { useToast } from "@/hooks/use-toast";

interface VoidPaymentDialogProps {
  paymentId: string;
  paymentNumber: string;
  amount: number;
  customerName: string;
}

export function VoidPaymentDialog({
  paymentId,
  paymentNumber,
  amount,
  customerName,
}: VoidPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleVoid = async () => {
    setIsVoiding(true);
    try {
      const result = await voidPayment(paymentId, reason);

      if (result.success) {
        toast({
          title: "Payment voided",
          description: `Payment ${paymentNumber} has been voided successfully.`,
        });
        router.push("/dashboard/payments");
        router.refresh();
      } else {
        toast({
          title: "Void failed",
          description: result.error || "Failed to void payment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsVoiding(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Void Payment
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void Payment {paymentNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will void the payment of ${amount.toFixed(2)} from {customerName}.
            The payment will be removed from applied documents and their balances will be restored.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason (optional)</Label>
          <Textarea
            id="void-reason"
            placeholder="Enter reason for voiding this payment..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleVoid}
            disabled={isVoiding}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isVoiding ? "Voiding..." : "Void Payment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
