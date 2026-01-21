"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { selectDocumentTypes } from "@/actions/integrations/acumatica/data-source";
import { getAcumaticaIntegration } from "@/actions/integrations/acumatica/connection";
import type { DocumentTypeSelection } from "@/lib/acumatica/config-types";

export default function DocumentTypeSelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [documentType, setDocumentType] =
    useState<DocumentTypeSelection>("SALES_INVOICES");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<string | null>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      const integration = await getAcumaticaIntegration();
      if (!integration) {
        router.push("/dashboard/integrations/acumatica/setup");
        return;
      }

      setIntegrationId(integration.id);

      // Check if document type already configured (based on dataSourceEntity)
      if (integration.dataSourceEntity) {
        setCurrentConfig(integration.dataSourceEntity);
        // Infer document type from entity
        if (integration.dataSourceEntity === "SalesOrder") {
          setDocumentType("SALES_ORDERS");
        } else if (integration.dataSourceEntity === "SalesInvoice") {
          setDocumentType("SALES_INVOICES");
        }
      }
    } catch (error) {
      console.error("Failed to load integration:", error);
      setError("Failed to load integration");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!integrationId) return;

    setSaving(true);
    setError(null);

    try {
      await selectDocumentTypes(integrationId, documentType);
      // Navigate to payment methods filter page (new step)
      router.push("/dashboard/integrations/acumatica/setup/filters");
    } catch (error) {
      console.error("Failed to configure document types:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to configure document types",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Select Document Types
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 2 of 4: Choose which documents to collect payments on
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: "50%" }}
        />
      </div>

      {/* Current Config Alert */}
      {currentConfig && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">
            Currently configured:{" "}
            {currentConfig === "SalesOrder" ? "Sales Orders" : "Sales Invoices"}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Document Type Selection */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            <CardTitle>Payment Collection Source</CardTitle>
          </div>
          <CardDescription>
            Select which Acumatica documents you want to collect payments on.
            Field mappings will be automatically configured based on your
            selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={documentType}
            onValueChange={(v) => setDocumentType(v as DocumentTypeSelection)}
          >
            <div className="space-y-4">
              {/* Sales Orders */}
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  documentType === "SALES_ORDERS"
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-border hover:border-purple-500/50"
                }`}
                onClick={() => setDocumentType("SALES_ORDERS")}
              >
                <RadioGroupItem
                  value="SALES_ORDERS"
                  id="sales-orders"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <Label
                      htmlFor="sales-orders"
                      className="text-base font-semibold cursor-pointer"
                    >
                      Sales Orders
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Collect payments on Sales Order documents. Best for
                    businesses that take orders before invoicing.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <strong>Fields:</strong> OrderTotal, UnpaidBalance,
                    OrderNbr, CustomerID, Date
                  </div>
                </div>
              </div>

              {/* Sales Invoices */}
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  documentType === "SALES_INVOICES"
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-border hover:border-purple-500/50"
                }`}
                onClick={() => setDocumentType("SALES_INVOICES")}
              >
                <RadioGroupItem
                  value="SALES_INVOICES"
                  id="sales-invoices"
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    <Label
                      htmlFor="sales-invoices"
                      className="text-base font-semibold cursor-pointer"
                    >
                      Sales Invoices
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Collect payments on Sales Invoice documents. Best for
                    traditional invoicing workflows.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <strong>Fields:</strong> Amount, Balance, ReferenceNbr,
                    CustomerID, Date
                  </div>
                </div>
              </div>

              {/* Both */}
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  documentType === "BOTH"
                    ? "border-purple-500 bg-purple-500/5"
                    : "border-border hover:border-purple-500/50"
                }`}
                onClick={() => setDocumentType("BOTH")}
              >
                <RadioGroupItem value="BOTH" id="both" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex -space-x-1">
                      <ShoppingCart className="h-5 w-5 text-purple-600" />
                      <Receipt className="h-5 w-5 text-indigo-600" />
                    </div>
                    <Label
                      htmlFor="both"
                      className="text-base font-semibold cursor-pointer"
                    >
                      Both Sales Orders and Invoices
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Collect payments on both document types. Provides maximum
                    flexibility for mixed workflows.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <strong>Note:</strong> Sales Orders will be used as the
                    primary data source
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardHeader>
          <CardTitle className="text-lg">Automatic Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Based on your selection, ARFlow will automatically configure:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Amount field</strong> - Total document amount
            </li>
            <li>
              <strong>Balance field</strong> - Remaining unpaid balance
            </li>
            <li>
              <strong>Date field</strong> - Document date
            </li>
            <li>
              <strong>Customer ID</strong> - Customer reference for mapping
            </li>
            <li>
              <strong>Unique ID</strong> - Document reference number
            </li>
          </ul>
          <p className="pt-2">
            No manual field mapping required - everything is set up
            automatically using Acumatica's default REST API endpoints.
          </p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/integrations/acumatica/setup")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Configuring...
            </>
          ) : (
            <>
              Continue to Preview
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
