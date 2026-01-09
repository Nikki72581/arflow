'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  previewAcumaticaData,
  validateIntegrationConfig,
} from '@/actions/integrations/acumatica/preview';
import { getAcumaticaIntegration } from '@/actions/integrations/acumatica/connection';
import type { PreviewDataResponse } from '@/lib/acumatica/config-types';

export default function PreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<PreviewDataResponse | null>(null);
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
        router.push('/dashboard/integrations/acumatica/setup');
        return;
      }

      setIntegrationId(integration.id);

      // Validate configuration
      const validation = await validateIntegrationConfig(integration.id);
      setConfigValid(validation);

      // If config is valid, auto-run preview
      if (validation.fieldMappingsValid && validation.filterConfigValid) {
        runPreview(integration.id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load integration');
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
      console.error('Failed to preview data:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to preview data'
      );
    } finally {
      setPreviewing(false);
    }
  };

  const handleContinue = () => {
    router.push('/dashboard/integrations/acumatica/setup/salespeople');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const hasErrors =
    !configValid.fieldMappingsValid || !configValid.filterConfigValid;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Preview Your Data
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 5 of 7: Verify your configuration with real Acumatica data
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: '71.43%' }}
        />
      </div>

      {/* Configuration Validation */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Configuration Errors:</p>
              {configValid.fieldMappingErrors.map((err, i) => (
                <p key={i} className="text-sm">
                  • {err}
                </p>
              ))}
              {configValid.filterConfigErrors.map((err, i) => (
                <p key={i} className="text-sm">
                  • {err}
                </p>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/integrations/acumatica/setup/field-mapping')}
                className="mt-2"
              >
                Fix Configuration
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
                  Sample of invoices that will be imported from Acumatica
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
                    Refresh Preview
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
                      Records Ready to Import
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
                    <div className="text-2xl font-bold text-indigo-600">
                      {previewData.validation.totalRecords}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Records in Preview
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                    <div className="text-2xl font-bold text-yellow-600">
                      {previewData.validation.unmappedSalespeople.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Unmapped Salespeople
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {previewData.validation.warnings.length > 0 && (
                  <Alert className="border-yellow-500/30 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {previewData.validation.warnings.map((warning, i) => (
                          <p key={i} className="text-sm text-yellow-800 dark:text-yellow-200">
                            {warning}
                          </p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Unmapped Salespeople Details */}
                {previewData.validation.unmappedSalespeople.length > 0 && (
                  <Alert className="border-indigo-500/30 bg-indigo-500/10">
                    <AlertDescription>
                      <p className="font-semibold text-sm mb-2">
                        Unmapped Salespeople:
                      </p>
                      <div className="space-y-1">
                        {previewData.validation.unmappedSalespeople.map((sp) => (
                          <p key={sp.salespersonId} className="text-sm">
                            • {sp.salespersonId}{' '}
                            <span className="text-muted-foreground">
                              ({sp.count} {sp.count === 1 ? 'invoice' : 'invoices'})
                            </span>
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        You'll map these salespeople in the next step.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sample Data Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Salesperson</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
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
                            <TableCell className="text-sm">
                              {record.salespersonId || (
                                <span className="text-red-500">(empty)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${record.amount.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.salespersonId ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 inline" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-600 inline" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Showing first {previewData.records.length} records. More records will be
                  imported during the sync.
                </p>
              </div>
            )}

            {!previewing && !previewData && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Click "Refresh Preview" to see sample data</p>
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
            Configuration looks good! {previewData.validation.readyToImport} records are
            ready to import. Continue to map your salespeople.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/integrations/acumatica/setup/filters')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={hasErrors || !previewData}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          Continue to Salesperson Mapping
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
