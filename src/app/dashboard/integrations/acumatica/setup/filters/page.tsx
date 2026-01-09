'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import {
  saveFilterConfig,
  getFilterConfig,
  getDefaultFilterConfig,
} from '@/actions/integrations/acumatica/filters';
import { getAcumaticaIntegration } from '@/actions/integrations/acumatica/connection';
import { getDiscoveredSchema } from '@/actions/integrations/acumatica/data-source';
import { getFieldMappings } from '@/actions/integrations/acumatica/field-mapping';
import type { FilterConfig, DiscoveredSchema, FieldInfo } from '@/lib/acumatica/config-types';

export default function FiltersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [schema, setSchema] = useState<DiscoveredSchema | null>(null);
  const [saving, setSaving] = useState(false);

  // Field selections for filters
  const [statusField, setStatusField] = useState('Status');
  const [documentTypeField, setDocumentTypeField] = useState('Type');
  const [dateField, setDateField] = useState('Date');

  // Status filter values
  const [statusValues, setStatusValues] = useState<string[]>(['Open', 'Closed']);

  // Document type filter values
  const [includeInvoice, setIncludeInvoice] = useState(true);
  const [includeCreditMemo, setIncludeCreditMemo] = useState(false);
  const [includeDebitMemo, setIncludeDebitMemo] = useState(false);

  // Date range
  const [startDate, setStartDate] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadData = async () => {
    try {
      const integration = await getAcumaticaIntegration();
      if (!integration) {
        router.push('/dashboard/integrations/acumatica/setup');
        return;
      }

      setIntegrationId(integration.id);

      // Check if field mappings are configured
      const fieldMappings = await getFieldMappings(integration.id);
      if (!fieldMappings) {
        router.push('/dashboard/integrations/acumatica/setup/field-mapping');
        return;
      }

      // Load discovered schema
      const discoveredSchema = await getDiscoveredSchema(integration.id);
      if (!discoveredSchema) {
        setError('Schema not discovered. Please go back and configure field mappings.');
        setLoading(false);
        return;
      }

      setSchema(discoveredSchema);

      // Load existing filter config or defaults
      const existingConfig = await getFilterConfig(integration.id);
      if (existingConfig) {
        setStatusField(existingConfig.status.field);
        setStatusValues(existingConfig.status.allowedValues);

        if (existingConfig.documentType) {
          setDocumentTypeField(existingConfig.documentType.field);
          const types = existingConfig.documentType.allowedValues;
          setIncludeInvoice(types.includes('Invoice'));
          setIncludeCreditMemo(types.includes('Credit Memo'));
          setIncludeDebitMemo(types.includes('Debit Memo'));
        }

        setDateField(existingConfig.dateRange.field);
        setStartDate(existingConfig.dateRange.startDate.split('T')[0]);
      } else {
        // Set defaults
        const defaults = await getDefaultFilterConfig();
        setStatusField(defaults.status.field);
        setStatusValues(defaults.status.allowedValues);
        setDateField(defaults.dateRange.field);
        setStartDate(defaults.dateRange.startDate.split('T')[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load filter configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (status: string, checked: boolean) => {
    if (checked) {
      setStatusValues([...statusValues, status]);
    } else {
      setStatusValues(statusValues.filter((s) => s !== status));
    }
  };

  const handleContinue = async () => {
    if (!integrationId) return;

    setSaving(true);
    setError(null);

    try {
      const documentTypes: string[] = [];
      if (includeInvoice) documentTypes.push('Invoice');
      if (includeCreditMemo) documentTypes.push('Credit Memo');
      if (includeDebitMemo) documentTypes.push('Debit Memo');

      const filterConfig: FilterConfig = {
        status: {
          field: statusField,
          allowedValues: statusValues,
        },
        documentType: {
          field: documentTypeField,
          allowedValues: documentTypes,
        },
        dateRange: {
          field: dateField,
          startDate: new Date(startDate).toISOString(),
        },
      };

      await saveFilterConfig(integrationId, filterConfig);
      router.push('/dashboard/integrations/acumatica/setup/preview');
    } catch (error) {
      console.error('Failed to save filter config:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to save filter configuration'
      );
    } finally {
      setSaving(false);
    }
  };

  const canContinue = statusValues.length > 0 && startDate &&
    (includeInvoice || includeCreditMemo || includeDebitMemo);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Schema not available. Please configure field mappings first.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard/integrations/acumatica/setup/field-mapping')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Field Mapping
        </Button>
      </div>
    );
  }

  // Categorize fields by type
  const stringFields = schema.fields.filter((f) => f.type === 'string');
  const dateFields = schema.fields.filter((f) => f.type === 'date' || f.type === 'datetime');

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Configure Data Filters
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 4 of 7: Choose which records to import from Acumatica
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: '57.14%' }}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schema Info */}
      <Alert className="border-indigo-500/30 bg-indigo-500/10">
        <Info className="h-4 w-4 text-indigo-600" />
        <AlertDescription className="text-indigo-700 dark:text-indigo-400">
          {schema.dataSourceType === 'REST_API' ? (
            <>Using REST API endpoint <strong>{schema.entity}</strong> with {schema.totalFields} fields discovered. These filters determine which records will be imported.</>
          ) : schema.dataSourceType === 'GENERIC_INQUIRY' ? (
            <>Using Generic Inquiry <strong>{schema.entity}</strong> with {schema.totalFields} fields discovered. These filters determine which records will be imported.</>
          ) : (
            <>Using schema from <strong>{schema.entity}</strong> with {schema.totalFields} fields discovered. These filters determine which records will be imported.</>
          )}
        </AlertDescription>
      </Alert>

      {/* Status Filter */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle>
            Status Filter <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            Choose which field to filter on and select allowed status values
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Field Selector */}
          <div className="space-y-2">
            <Label htmlFor="status-field">
              Status Field <span className="text-red-500">*</span>
            </Label>
            <Select value={statusField} onValueChange={setStatusField}>
              <SelectTrigger id="status-field">
                <SelectValue placeholder="Select status field..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {stringFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{field.name}</span>
                      {field.isCustom && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded">
                          Custom
                        </span>
                      )}
                      {field.sampleValue && (
                        <span className="text-xs text-muted-foreground">
                          e.g., {String(field.sampleValue).substring(0, 20)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The field that contains the record status (e.g., Open, Closed, etc.)
            </p>
          </div>

          {/* Status Values */}
          <div className="space-y-2">
            <Label>Allowed Status Values <span className="text-red-500">*</span></Label>
            <div className="space-y-3">
              {['Hold', 'Balanced', 'Open', 'Closed', 'Voided'].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.toLowerCase()}`}
                    checked={statusValues.includes(status)}
                    onCheckedChange={(checked) =>
                      handleStatusToggle(status, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`status-${status.toLowerCase()}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {status}
                    {status === 'Open' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (released, awaiting payment)
                      </span>
                    )}
                    {status === 'Closed' && (
                      <span className="ml-2 text-xs text-muted-foreground">(paid)</span>
                    )}
                  </Label>
                </div>
              ))}
              {statusValues.length === 0 && (
                <p className="text-sm text-red-500">
                  At least one status must be selected
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Type Filter */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle>
            Document Type Filter <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            Choose which field contains the document type and select allowed types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type Field Selector */}
          <div className="space-y-2">
            <Label htmlFor="document-type-field">
              Document Type Field <span className="text-red-500">*</span>
            </Label>
            <Select value={documentTypeField} onValueChange={setDocumentTypeField}>
              <SelectTrigger id="document-type-field">
                <SelectValue placeholder="Select document type field..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {stringFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{field.name}</span>
                      {field.isCustom && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded">
                          Custom
                        </span>
                      )}
                      {field.sampleValue && (
                        <span className="text-xs text-muted-foreground">
                          e.g., {String(field.sampleValue).substring(0, 20)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The field that contains the document type (e.g., Invoice, Credit Memo, etc.)
            </p>
          </div>

          {/* Document Type Values */}
          <div className="space-y-2">
            <Label>Allowed Document Types <span className="text-red-500">*</span></Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-invoice"
                  checked={includeInvoice}
                  onCheckedChange={(checked) => setIncludeInvoice(checked as boolean)}
                />
                <Label
                  htmlFor="type-invoice"
                  className="text-sm font-normal cursor-pointer"
                >
                  Invoice
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-credit-memo"
                  checked={includeCreditMemo}
                  onCheckedChange={(checked) => setIncludeCreditMemo(checked as boolean)}
                />
                <Label
                  htmlFor="type-credit-memo"
                  className="text-sm font-normal cursor-pointer"
                >
                  Credit Memo
                  <span className="ml-2 text-xs text-muted-foreground">
                    (creates negative amounts)
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-debit-memo"
                  checked={includeDebitMemo}
                  onCheckedChange={(checked) => setIncludeDebitMemo(checked as boolean)}
                />
                <Label
                  htmlFor="type-debit-memo"
                  className="text-sm font-normal cursor-pointer"
                >
                  Debit Memo
                </Label>
              </div>

              {!includeInvoice && !includeCreditMemo && !includeDebitMemo && (
                <p className="text-sm text-red-500">
                  At least one document type must be selected
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle>
            Date Range <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            Choose which date field to filter on and set the start date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Field Selector */}
          <div className="space-y-2">
            <Label htmlFor="date-field">
              Date Field <span className="text-red-500">*</span>
            </Label>
            <Select value={dateField} onValueChange={setDateField}>
              <SelectTrigger id="date-field">
                <SelectValue placeholder="Select date field..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {dateFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{field.name}</span>
                      {field.isCustom && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded">
                          Custom
                        </span>
                      )}
                      {field.sampleValue && (
                        <span className="text-xs text-muted-foreground">
                          e.g., {String(field.sampleValue).substring(0, 20)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The date field to filter on (e.g., invoice date, document date, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-muted-foreground">
              Only records on or after this date will be imported
            </p>
          </div>

          <Alert className="border-yellow-500/30 bg-yellow-500/10">
            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> There is no end date. The integration will continuously
              sync new records as they are created in Acumatica.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Branch Filter - Coming Soon */}
      <Card className="border-border opacity-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branch Filter</CardTitle>
              <CardDescription>Filter by specific branches</CardDescription>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-muted/60 text-muted-foreground rounded-full">
              Coming Soon
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Advanced branch filtering will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/integrations/acumatica/setup/field-mapping')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
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
