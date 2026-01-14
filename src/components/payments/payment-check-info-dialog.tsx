"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePaymentMethodInfo } from "@/app/actions/payments";
import { PaymentMethod } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentCheckInfoDialogProps {
  paymentId: string;
  currentMethod: PaymentMethod;
  referenceNumber?: string | null;
}

export function PaymentCheckInfoDialog({
  paymentId,
  currentMethod,
  referenceNumber,
}: PaymentCheckInfoDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const allowedMethods: PaymentMethod[] = ["CHECK", "WIRE", "ACH", "OTHER"];
  const defaultMethod = allowedMethods.includes(currentMethod)
    ? currentMethod
    : "CHECK";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [reference, setReference] = useState(referenceNumber || "");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updatePaymentMethodInfo({
        paymentId,
        paymentMethod,
        referenceNumber: reference || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update payment.");
      }

      toast({
        title: "Payment updated",
        description: "Payment method and reference were saved.",
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Receipt className="mr-2 h-4 w-4" />
          Record Check Info
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record Check or Reference Info</DialogTitle>
          <DialogDescription>
            Update the payment method and reference number for this payment.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="WIRE">Wire Transfer</SelectItem>
                <SelectItem value="ACH">ACH</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reference-number">Reference Number</Label>
            <Input
              id="reference-number"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check number, wire confirmation, or reference"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
