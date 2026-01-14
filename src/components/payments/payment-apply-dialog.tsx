"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyPaymentToDocuments, getOpenDocumentsForPayment } from "@/app/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PaymentApplyDialogProps {
  paymentId: string;
  customerId: string;
  remainingAmount: number;
}

export function PaymentApplyDialog({
  paymentId,
  customerId,
  remainingAmount,
}: PaymentApplyDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    setLoading(true);
    getOpenDocumentsForPayment(customerId)
      .then((docs) => {
        setDocuments(docs);
        const nextSelected: Record<string, boolean> = {};
        const nextAmounts: Record<string, string> = {};
        docs.forEach((doc: any) => {
          nextSelected[doc.id] = false;
          nextAmounts[doc.id] = doc.balanceDue.toFixed(2);
        });
        setSelected(nextSelected);
        setAmounts(nextAmounts);
      })
      .catch(() => {
        setError("Failed to load available documents.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, customerId]);

  const totalSelected = useMemo(() => {
    return documents.reduce((sum, doc) => {
      if (!selected[doc.id]) {
        return sum;
      }
      const amount = parseFloat(amounts[doc.id] || "0");
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [documents, selected, amounts]);

  const handleToggle = (docId: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [docId]: checked }));
  };

  const handleApply = async () => {
    setError(null);

    const selectedDocs = documents.filter((doc) => selected[doc.id]);
    if (selectedDocs.length === 0) {
      setError("Select at least one document to apply.");
      return;
    }

    const applications = selectedDocs.map((doc) => {
      const amount = parseFloat(amounts[doc.id] || "0");
      return {
        documentId: doc.id,
        amount: Number.isFinite(amount) ? amount : 0,
        balanceDue: doc.balanceDue,
      };
    });

    for (const application of applications) {
      if (application.amount <= 0) {
        setError("Applied amounts must be greater than zero.");
        return;
      }
      if (application.amount > application.balanceDue) {
        setError("Applied amount exceeds a document balance due.");
        return;
      }
    }

    if (totalSelected > remainingAmount) {
      setError("Applied total exceeds the remaining payment balance.");
      return;
    }

    setSaving(true);
    try {
      const result = await applyPaymentToDocuments({
        paymentId,
        applications: applications.map((app) => ({
          documentId: app.documentId,
          amount: app.amount,
        })),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to apply payment.");
      }

      toast({
        title: "Payment applied",
        description: "The payment has been applied to the selected documents.",
      });

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to apply payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={remainingAmount <= 0}
        >
          <FileText className="mr-2 h-4 w-4" />
          Apply to Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Apply Payment</DialogTitle>
          <DialogDescription>
            Apply up to {formatCurrency(remainingAmount)} across one or more documents.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-lg border bg-muted/30">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No open documents to apply.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc: any) => (
                  <TableRow key={doc.id} className="hover:bg-accent/40">
                    <TableCell>
                      <Checkbox
                        checked={!!selected[doc.id]}
                        onCheckedChange={(checked) => handleToggle(doc.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{doc.documentNumber}</TableCell>
                    <TableCell>{doc.documentType}</TableCell>
                    <TableCell>{doc.dueDate ? formatDate(doc.dueDate) : "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(doc.balanceDue)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={doc.balanceDue}
                        value={amounts[doc.id] || ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [doc.id]: e.target.value,
                          }))
                        }
                        disabled={!selected[doc.id]}
                        className="h-8 w-[120px] text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Selected total:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(totalSelected)}
            </span>
          </span>
          <span>
            Remaining balance:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(Math.max(remainingAmount - totalSelected, 0))}
            </span>
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={saving || loading}>
            {saving ? (
              "Applying..."
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Apply Payment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
