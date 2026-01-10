"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { upsertPaymentTermType, deletePaymentTermType } from "@/app/actions/payment-term-types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Star, Percent, Calendar } from "lucide-react";

interface PaymentTermType {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  code: string;
  daysDue: number;
  hasDiscount: boolean;
  discountDays: number | null;
  discountPercentage: number | null;
  enabled: boolean;
  displayOrder: number;
  isDefault: boolean;
}

interface PaymentTermsSettingsFormProps {
  initialTerms: PaymentTermType[];
}

interface FormData {
  id?: string;
  name: string;
  code: string;
  description: string;
  daysDue: string;
  hasDiscount: boolean;
  discountDays: string;
  discountPercentage: string;
  enabled: boolean;
  displayOrder: number;
  isDefault: boolean;
}

export function PaymentTermsSettingsForm({ initialTerms }: PaymentTermsSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [terms, setTerms] = useState<PaymentTermType[]>(initialTerms);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [termToDelete, setTermToDelete] = useState<PaymentTermType | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTermType | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    description: "",
    daysDue: "30",
    hasDiscount: false,
    discountDays: "10",
    discountPercentage: "2",
    enabled: true,
    displayOrder: terms.length + 1,
    isDefault: false,
  });

  const handleAdd = () => {
    setEditingTerm(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      daysDue: "30",
      hasDiscount: false,
      discountDays: "10",
      discountPercentage: "2",
      enabled: true,
      displayOrder: terms.length + 1,
      isDefault: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (term: PaymentTermType) => {
    setEditingTerm(term);
    setFormData({
      id: term.id,
      name: term.name,
      code: term.code,
      description: term.description || "",
      daysDue: term.daysDue.toString(),
      hasDiscount: term.hasDiscount,
      discountDays: term.discountDays?.toString() || "10",
      discountPercentage: term.discountPercentage?.toString() || "2",
      enabled: term.enabled,
      displayOrder: term.displayOrder,
      isDefault: term.isDefault,
    });
    setDialogOpen(true);
  };

  const handleDelete = (term: PaymentTermType) => {
    setTermToDelete(term);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!termToDelete) return;

    setSaving(true);
    try {
      await deletePaymentTermType(termToDelete.id);

      toast({
        title: "Payment term deleted",
        description: `${termToDelete.name} has been removed successfully.`,
      });

      setTerms(prev => prev.filter(t => t.id !== termToDelete.id));
      setDeleteDialogOpen(false);
      setTermToDelete(null);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment term. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Payment term name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.code.trim()) {
      toast({
        title: "Validation Error",
        description: "Payment term code is required.",
        variant: "destructive",
      });
      return;
    }

    const daysDue = parseInt(formData.daysDue);
    if (isNaN(daysDue) || daysDue <= 0) {
      toast({
        title: "Validation Error",
        description: "Days due must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    if (formData.hasDiscount) {
      const discountDays = parseInt(formData.discountDays);
      const discountPercentage = parseFloat(formData.discountPercentage);

      if (isNaN(discountDays) || discountDays <= 0) {
        toast({
          title: "Validation Error",
          description: "Discount days must be a positive number.",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(discountPercentage) || discountPercentage <= 0 || discountPercentage > 100) {
        toast({
          title: "Validation Error",
          description: "Discount percentage must be between 0 and 100.",
          variant: "destructive",
        });
        return;
      }

      if (discountDays >= daysDue) {
        toast({
          title: "Validation Error",
          description: "Discount days must be less than payment due days.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const result = await upsertPaymentTermType({
        ...(formData.id && { id: formData.id }),
        name: formData.name,
        code: formData.code.toUpperCase().replace(/\s+/g, "_"),
        description: formData.description || undefined,
        daysDue: parseInt(formData.daysDue),
        hasDiscount: formData.hasDiscount,
        discountDays: formData.hasDiscount ? parseInt(formData.discountDays) : null,
        discountPercentage: formData.hasDiscount ? parseFloat(formData.discountPercentage) : null,
        enabled: formData.enabled,
        displayOrder: formData.displayOrder,
        isDefault: formData.isDefault,
      });

      toast({
        title: editingTerm ? "Payment term updated" : "Payment term created",
        description: `${formData.name} has been ${editingTerm ? "updated" : "created"} successfully.`,
      });

      setDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save payment term. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (term: PaymentTermType) => {
    setSaving(true);
    try {
      await upsertPaymentTermType({
        id: term.id,
        name: term.name,
        code: term.code,
        description: term.description || undefined,
        daysDue: term.daysDue,
        hasDiscount: term.hasDiscount,
        discountDays: term.discountDays,
        discountPercentage: term.discountPercentage,
        enabled: !term.enabled,
        displayOrder: term.displayOrder,
        isDefault: term.isDefault,
      });

      setTerms(prev =>
        prev.map(t =>
          t.id === term.id ? { ...t, enabled: !t.enabled } : t
        )
      );

      toast({
        title: "Payment term updated",
        description: `${term.name} has been ${!term.enabled ? "enabled" : "disabled"}.`,
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment term. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Term Configuration</CardTitle>
              <CardDescription>
                Configure payment terms with due dates and early payment discount options
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Term
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {terms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment terms configured yet.</p>
              <p className="text-sm">Click "Add Payment Term" to create your first one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {terms.map((term) => (
                <div
                  key={term.id}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={term.enabled}
                        onCheckedChange={() => handleToggleEnabled(term)}
                        disabled={saving}
                      />
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{term.name}</h3>
                        {term.isDefault && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </Badge>
                        )}
                        {term.hasDiscount && (
                          <Badge variant="outline" className="gap-1">
                            <Percent className="h-3 w-3" />
                            {term.discountPercentage}% in {term.discountDays} days
                          </Badge>
                        )}
                      </div>
                    </div>
                    {term.description && (
                      <p className="text-sm text-muted-foreground ml-11">{term.description}</p>
                    )}
                    <div className="flex items-center gap-4 ml-11 text-sm text-muted-foreground">
                      <span>Code: {term.code}</span>
                      <span>•</span>
                      <span>Due in {term.daysDue} days</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(term)}
                      disabled={saving}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(term)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? "Edit Payment Term" : "Add Payment Term"}
            </DialogTitle>
            <DialogDescription>
              Configure payment term details including due dates and optional early payment discounts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Net 30, 2% 10 Net 30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., NET_30, 2_10_NET_30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of the payment term"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysDue">Days Due *</Label>
              <Input
                id="daysDue"
                type="number"
                min="1"
                value={formData.daysDue}
                onChange={(e) => setFormData({ ...formData, daysDue: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Number of days from document date until payment is due
              </p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="hasDiscount"
                  checked={formData.hasDiscount}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasDiscount: checked })
                  }
                />
                <Label htmlFor="hasDiscount" className="cursor-pointer">
                  Enable Early Payment Discount
                </Label>
              </div>

              {formData.hasDiscount && (
                <div className="grid gap-4 sm:grid-cols-2 ml-11">
                  <div className="space-y-2">
                    <Label htmlFor="discountDays">Discount Days *</Label>
                    <Input
                      id="discountDays"
                      type="number"
                      min="1"
                      value={formData.discountDays}
                      onChange={(e) =>
                        setFormData({ ...formData, discountDays: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Days within which discount applies
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountPercentage">Discount Percentage *</Label>
                    <Input
                      id="discountPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.discountPercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, discountPercentage: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage discount (0-100)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t pt-4">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked })
                }
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default payment term
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTerm ? "Update" : "Create"} Payment Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Term?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{termToDelete?.name}"? This action cannot be undone.
              {termToDelete && (
                <span className="block mt-2 text-sm">
                  This payment term cannot be deleted if it is currently in use by any customers.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
