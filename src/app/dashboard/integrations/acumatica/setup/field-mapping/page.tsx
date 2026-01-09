'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  getDiscoveredSchema,
  getDataSourceConfig,
} from '@/actions/integrations/acumatica/data-source';
import {
  saveFieldMappings,
  getFieldMappings,
  autoSuggestFieldMappings,
} from '@/actions/integrations/acumatica/field-mapping';
import { getAcumaticaIntegration } from '@/actions/integrations/acumatica/connection';
import type { FieldMappingConfig, FieldInfo, DiscoveredSchema } from '@/lib/acumatica/config-types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function FieldMappingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [schema, setSchema] = useState<DiscoveredSchema | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSuggesting, setAutoSuggesting] = useState(false);

  const [importLevel, setImportLevel] = useState<'INVOICE_TOTAL' | 'LINE_LEVEL'>('INVOICE_TOTAL');
  const [salespersonLevel, setSalespersonLevel] = useState<'header' | 'line' | 'detail_tab'>('header');

  // Required field mappings
  const [amountField, setAmountField] = useState('');
  const [dateField, setDateField] = useState('');
  const [salespersonField, setSalespersonField] = useState('');
  const [uniqueIdField, setUniqueIdField] = useState('');
  const [customerIdField, setCustomerIdField] = useState('');
  const [customerNameField, setCustomerNameField] = useState('');

  // Optional field mappings
  const [projectField, setProjectField] = useState('');
  const [descriptionField, setDescriptionField] = useState('');
  const [branchField, setBranchField] = useState('');

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

      // Check if data source is configured
      const dataSourceConfig = await getDataSourceConfig(integration.id);
      if (!dataSourceConfig) {
        router.push('/dashboard/integrations/acumatica/setup/data-source');
        return;
      }

      // Load discovered schema
      const discoveredSchema = await getDiscoveredSchema(integration.id);
      if (!discoveredSchema) {
        setError('Schema not discovered. Please go back and select a data source.');
        setLoading(false);
        return;
      }

      setSchema(discoveredSchema);

      // Load existing field mappings if available
      const existingMappings = await getFieldMappings(integration.id);
      if (existingMappings) {
        setImportLevel(existingMappings.importLevel);
        setSalespersonLevel(existingMappings.salesperson.sourceLevel);
        setAmountField(existingMappings.amount.sourceField);
        setDateField(existingMappings.date.sourceField);
        setSalespersonField(existingMappings.salesperson.sourceField);
        setUniqueIdField(existingMappings.uniqueId.sourceField);
        setCustomerIdField(existingMappings.customer.idField);
        setCustomerNameField(existingMappings.customer.nameField || '');
        setProjectField(existingMappings.project?.sourceField || '');
        setDescriptionField(existingMappings.description?.sourceField || '');
        setBranchField(existingMappings.branch?.sourceField || '');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load schema data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSuggest = async () => {
    if (!integrationId) return;

    setAutoSuggesting(true);
    try {
      const suggestions = await autoSuggestFieldMappings(integrationId);

      if (suggestions.amount) setAmountField(suggestions.amount.sourceField);
      if (suggestions.date) setDateField(suggestions.date.sourceField);
      if (suggestions.salesperson) setSalespersonField(suggestions.salesperson.sourceField);
      if (suggestions.uniqueId) setUniqueIdField(suggestions.uniqueId.sourceField);
      if (suggestions.customer) setCustomerIdField(suggestions.customer.sourceField);
      if (suggestions.project) setProjectField(suggestions.project.sourceField);
    } catch (error) {
      console.error('Auto-suggest failed:', error);
    } finally {
      setAutoSuggesting(false);
    }
  };

  const handleContinue = async () => {
    if (!integrationId) return;

    setSaving(true);
    setError(null);

    try {
      const fieldMappings: FieldMappingConfig = {
        importLevel,
        amount: {
          sourceField: amountField,
          sourceType: 'decimal',
        },
        date: {
          sourceField: dateField,
          sourceType: 'date',
        },
        salesperson: {
          sourceField: salespersonField,
          sourceLevel: salespersonLevel,
        },
        uniqueId: {
          sourceField: uniqueIdField,
        },
        customer: {
          idField: customerIdField,
          nameField: customerNameField && customerNameField !== '__UNMAPPED__' ? customerNameField : undefined,
        },
      };

      // Add optional mappings (skip if unmapped)
      if (projectField && projectField !== '__UNMAPPED__') {
        fieldMappings.project = { sourceField: projectField };
      }
      if (descriptionField && descriptionField !== '__UNMAPPED__') {
        fieldMappings.description = { sourceField: descriptionField };
      }
      if (branchField && branchField !== '__UNMAPPED__') {
        fieldMappings.branch = { sourceField: branchField };
      }

      await saveFieldMappings(integrationId, fieldMappings);
      router.push('/dashboard/integrations/acumatica/setup/filters');
    } catch (error) {
      console.error('Failed to save field mappings:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to save field mappings'
      );
    } finally {
      setSaving(false);
    }
  };

  const canContinue =
    amountField && dateField && salespersonField && uniqueIdField && customerIdField;

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
            {error || 'Schema not available. Please select a data source first.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard/integrations/acumatica/setup/data-source')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Data Source
        </Button>
      </div>
    );
  }

  const fieldsByType = {
    amount: schema.fields.filter((f) => f.type === 'decimal'),
    date: schema.fields.filter((f) => f.type === 'date' || f.type === 'datetime'),
    string: schema.fields.filter((f) => f.type === 'string'),
    all: schema.fields,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Map Acumatica Fields
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 3 of 7: Connect Acumatica fields to ARFlow
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: '42.86%' }}
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
          Discovered {schema.totalFields} fields from {schema.entity}
          {schema.customFieldCount > 0 && ` (including ${schema.customFieldCount} custom fields)`}
        </AlertDescription>
      </Alert>

      {/* Auto-Suggest Button */}
      <Button
        onClick={handleAutoSuggest}
        disabled={autoSuggesting}
        variant="outline"
        className="w-full border-purple-500/30"
      >
        {autoSuggesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Auto-Suggesting...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Auto-Suggest Field Mappings
          </>
        )}
      </Button>

      {/* Import Level */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle>Import Level</CardTitle>
          <CardDescription>
            Should we import totals per invoice, or individual line items?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={importLevel} onValueChange={(v) => setImportLevel(v as any)}>
            <div className="flex items-center space-x-2 p-3 rounded-lg border">
              <RadioGroupItem value="INVOICE_TOTAL" id="invoice-total" />
              <Label htmlFor="invoice-total" className="flex-1 cursor-pointer">
                <div className="font-semibold">Invoice Total</div>
                <div className="text-sm text-muted-foreground">
                  Import one sale per invoice with the total amount
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border opacity-50">
              <RadioGroupItem value="LINE_LEVEL" id="line-level" disabled />
              <Label htmlFor="line-level" className="flex-1">
                <div className="font-semibold">Line Level (Coming Soon)</div>
                <div className="text-sm text-muted-foreground">
                  Import individual line items from each invoice
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Required Mappings */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle>Required Field Mappings</CardTitle>
          <CardDescription>
            These fields must be mapped for the integration to work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount */}
          <FieldSelector
            label="Sale Amount"
            description="The monetary value used for commission calculation"
            required
            value={amountField}
            onChange={setAmountField}
            fields={fieldsByType.amount}
            placeholder="Select amount field..."
          />

          {/* Date */}
          <FieldSelector
            label="Sale Date"
            description="The date of the sale for reporting and commission periods"
            required
            value={dateField}
            onChange={setDateField}
            fields={fieldsByType.date}
            placeholder="Select date field..."
          />

          {/* Salesperson */}
          <div className="space-y-3">
            <FieldSelector
              label="Salesperson Identifier"
              description="Links the sale to a ARFlow user"
              required
              value={salespersonField}
              onChange={setSalespersonField}
              fields={fieldsByType.string}
              placeholder="Select salesperson field..."
            />

            <div className="pl-6 space-y-2">
              <Label className="text-sm font-normal">Salesperson Location</Label>
              <RadioGroup
                value={salespersonLevel}
                onValueChange={(v) => setSalespersonLevel(v as any)}
                className="gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="header" id="sp-header" />
                  <Label htmlFor="sp-header" className="font-normal cursor-pointer">
                    Invoice Header (one salesperson per invoice)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <RadioGroupItem value="line" id="sp-line" disabled />
                  <Label htmlFor="sp-line" className="font-normal">
                    Line Level (different salespeople per line) - Coming Soon
                  </Label>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <RadioGroupItem value="detail_tab" id="sp-detail" disabled />
                  <Label htmlFor="sp-detail" className="font-normal">
                    Detail Tab (commission splits) - Coming Soon
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Unique ID */}
          <FieldSelector
            label="Unique Record Identifier"
            description="Prevents duplicate imports - must be unique per record"
            required
            value={uniqueIdField}
            onChange={setUniqueIdField}
            fields={fieldsByType.string}
            placeholder="Select unique ID field..."
          />

          {/* Customer ID */}
          <FieldSelector
            label="Customer Identifier"
            description="Links the sale to a ARFlow client"
            required
            value={customerIdField}
            onChange={setCustomerIdField}
            fields={fieldsByType.string}
            placeholder="Select customer ID field..."
          />
        </CardContent>
      </Card>

      {/* Optional Mappings */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle>Additional Field Mappings</CardTitle>
          <CardDescription>
            These fields can enhance your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldSelector
            label="Customer Name"
            description="Display name for the customer"
            value={customerNameField}
            onChange={setCustomerNameField}
            fields={fieldsByType.string}
            placeholder="Select customer name field..."
          />

          <FieldSelector
            label="Project"
            description="Link sales to ARFlow projects"
            value={projectField}
            onChange={setProjectField}
            fields={fieldsByType.string}
            placeholder="Select project field..."
          />

          <FieldSelector
            label="Description"
            description="Additional context for the sale"
            value={descriptionField}
            onChange={setDescriptionField}
            fields={fieldsByType.string}
            placeholder="Select description field..."
          />

          <FieldSelector
            label="Branch"
            description="Store the source branch for filtering/reporting"
            value={branchField}
            onChange={setBranchField}
            fields={fieldsByType.string}
            placeholder="Select branch field..."
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/integrations/acumatica/setup/data-source')}
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
              Continue to Filters
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Field Selector Component
function FieldSelector({
  label,
  description,
  required,
  value,
  onChange,
  fields,
  placeholder,
}: {
  label: string;
  description: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  fields: FieldInfo[];
  placeholder: string;
}) {
  const selectedField = fields.find((f) => f.name === value);

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {!required && (
            <SelectItem value="__UNMAPPED__">
              <span className="text-muted-foreground">(Not mapped)</span>
            </SelectItem>
          )}
          {fields.map((field) => (
            <SelectItem key={field.name} value={field.name}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{field.name}</span>
                {field.isNested && field.parentEntity && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded">
                    {field.parentEntity}
                  </span>
                )}
                {field.isCustom && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded">
                    Custom
                  </span>
                )}
                {field.sampleValue !== undefined && field.sampleValue !== null && (
                  <span className="text-xs text-muted-foreground">
                    e.g., {String(field.sampleValue).substring(0, 30)}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">{description}</p>
      {selectedField?.sampleValue && (
        <div className="text-xs text-muted-foreground bg-muted/60 p-2 rounded font-mono border border-border">
          Sample: {String(selectedField.sampleValue)}
        </div>
      )}
    </div>
  );
}
