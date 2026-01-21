"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Rocket,
  Settings,
} from "lucide-react";
import {
  previewAcumaticaData,
  validateIntegrationConfig,
} from "@/actions/integrations/acumatica/preview";
import { getAcumaticaIntegration } from "@/actions/integrations/acumatica/connection";
import { getFieldMappings } from "@/actions/integrations/acumatica/field-mapping";
import type {
  PreviewDataResponse,
  FieldMappingConfig,
} from "@/lib/acumatica/config-types";

export default function PreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<PreviewDataResponse | null>(
    null,
  );
  const [fieldMappings, setFieldMappings] = useState<FieldMappingConfig | null>(
    null,
  );
  const [configValid, setConfigValid] = useState({
    fieldMappingsValid: false,
    filterConfigValid: false,
    fieldMappingErrors: [] as string[],
    filterConfigErrors: [] as string[],
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const integration = await getAcumaticaIntegration();
      if (!integration) {
        router.push("/dashboard/integrations/acumatica/setup");
        return;
      }

      // Check if document type is configured
      if (!integration.dataSourceEntity) {
        router.push("/dashboard/integrations/acumatica/setup/document-type");
        return;
      }

      setIntegrationId(integration.id);

      // Load field mappings
      const mappings = await getFieldMappings(integration.id);
      setFieldMappings(mappings);

      // Validate configuration
      const validation = await validateIntegrationConfig(integration.id);
      setConfigValid(validation);

      // Auto-run preview
      runPreview(integration.id);
    } catch (error) {
      console.error("Failed to load data:", error);
      setError("Failed to load integration");
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async (id?: string) => {
    const targetId = id || integrationId;
    if (!targetId) return;

    setPreviewing(true);
    setError(null);

    try {
      const preview = await previewAcumaticaData(targetId, 10);
      setPreviewData(preview);
    } catch (error) {
      console.error("Failed to preview data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to preview data",
      );
    } finally {
      setPreviewing(false);
    }
  };

  const handleActivate = async () => {
    if (!integrationId) return;

    setActivating(true);
    setError(null);

    try {
      // Navigate to dashboard after activation
      router.push("/dashboard/integrations/acumatica");
    } catch (error) {
      console.error("Failed to activate integration:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to activate integration",
      );
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const hasErrors = !configValid.fieldMappingsValid;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Preview & Activate
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 3 of 3: Review your configuration and activate the integration
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: "100%" }}
        />
      </div>

      {/* Configuration Summary */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            <CardTitle>Configuration Summary</CardTitle>
          </div>
          <CardDescription>
            Auto-configured field mappings based on your document type selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fieldMappings && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  Amount Field
                </div>
                <div className="font-mono text-sm">
                  {fieldMappings.amount.sourceField}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  Balance Field
                </div>
                <div className="font-mono text-sm">
                  {fieldMappings.balance.sourceField}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  Date Field
                </div>
                <div className="font-mono text-sm">
                  {fieldMappings.date.sourceField}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  Unique ID
                </div>
                <div className="font-mono text-sm">
                  {fieldMappings.uniqueId.sourceField}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  Customer ID
                </div>
                <div className="font-mono text-sm">
                  {fieldMappings.customer.idField}
                </div>
              </div>
              {fieldMappings.description && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">
                    Description
                  </div>
                  <div className="font-mono text-sm">
                    {fieldMappings.description.sourceField}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Validation */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Configuration Errors:</p>
              {configValid.fieldMappingErrors.map((err, i) => (
                <p key={i} className="text-sm">
                  - {err}
                </p>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    "/dashboard/integrations/acumatica/setup/document-type",
                  )
                }
                className="mt-2"
              >
                Reconfigure
              </Button>
            </div>
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

      {/* Preview Controls */}
      {!hasErrors && (
        <Card className="border-purple-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Sample documents from Acumatica with their amounts and
                  balances
                </CardDescription>
              </div>
              <Button
                onClick={() => runPreview()}
                disabled={previewing}
                variant="outline"
                size="sm"
              >
                {previewing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {previewing && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            )}

            {!previewing && previewData && (
              <div className="space-y-4">
                {/* Validation Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-600">
                      {previewData.validation.readyToImport}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Records Ready
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
                    <div className="text-2xl font-bold text-indigo-600">
                      {previewData.validation.totalRecords}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total in Preview
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-purple-500/5 border-purple-500/20">
                    <div className="text-2xl font-bold text-purple-600">
                      {previewData.validation.unmappedCustomers?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Unique Customers
                    </div>
                  </div>
                </div>

                {/* Sample Data Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.records.map((record: any, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-sm">
                              {record.uniqueId}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(record.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{record.customerId}</div>
                              {record.customerName && (
                                <div className="text-xs text-muted-foreground">
                                  {record.customerName}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              $
                              {record.amount?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) || "0.00"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              $
                              {record.balance?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) || "0.00"}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.balance > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  Open
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  Paid
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Showing first {previewData.records.length} records from
                  Acumatica
                </p>
              </div>
            )}

            {!previewing && !previewData && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Click "Refresh" to see sample data</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {previewData && previewData.validation.readyToImport > 0 && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">
            Configuration complete! Your Acumatica integration is ready to
            collect payments on {previewData.validation.totalRecords} documents.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push("/dashboard/integrations/acumatica/setup/document-type")
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleActivate}
          disabled={hasErrors || activating}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {activating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Activate Integration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
