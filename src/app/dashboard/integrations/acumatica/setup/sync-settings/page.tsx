'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Loader2, Filter, Settings, Database, Clock } from 'lucide-react';
import Link from 'next/link';
import { getSyncSettings, saveSyncSettings, type SyncSettingsData } from '@/actions/integrations/acumatica/sync-settings';
import { useToast } from '@/hooks/use-toast';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function SyncSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SyncSettingsData>({
    invoiceStartDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    invoiceEndDate: null,
    branchFilterMode: 'ALL',
    selectedBranches: [],
    includeInvoices: true,
    includeCreditMemos: false,
    includeDebitMemos: false,
    customerHandling: 'AUTO_CREATE',
    customerIdSource: 'CUSTOMER_CD',
    projectAutoCreate: true,
    noProjectHandling: 'NO_PROJECT',
    importLevel: 'INVOICE_TOTAL',
    invoiceAmountField: 'AMOUNT',
    lineAmountField: 'EXTENDED_PRICE',
    lineFilterMode: 'ALL',
    lineFilterValues: [],
    storeItemId: true,
    storeItemDescription: true,
    storeItemClass: false,
    storeGLAccount: false,
    storeQtyAndPrice: false,
    syncFrequency: 'MANUAL',
    syncTime: null,
    syncDayOfWeek: null,
  });

  const [branchesText, setBranchesText] = useState('');
  const [lineFilterText, setLineFilterText] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const result = await getSyncSettings();
    if (result.success && result.settings) {
      setFormData(result.settings);
      setBranchesText((result.settings.selectedBranches || []).join(', '));
      setLineFilterText((result.settings.lineFilterValues || []).join(', '));
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load settings',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);

    // Parse branches and filter values
    const selectedBranches = branchesText
      .split(',')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const lineFilterValues = lineFilterText
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    const dataToSave = {
      ...formData,
      selectedBranches: formData.branchFilterMode === 'SELECTED' ? selectedBranches : [],
      lineFilterValues: formData.lineFilterMode !== 'ALL' ? lineFilterValues : [],
    };

    const result = await saveSyncSettings(dataToSave);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Sync settings saved successfully',
      });
      router.push('/dashboard/integrations');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save settings',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/integrations">Integrations</Link>
          <span>/</span>
          <Link href="/dashboard/integrations/acumatica/setup">Acumatica Setup</Link>
          <span>/</span>
          <span>Sync Settings</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
              Sync Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Step 7 of 7: Configure data synchronization settings
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: '100%' }}
        />
      </div>

      {/* Document Type Filtering */}
      <Card className="border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle>Document Type Filtering</CardTitle>
          </div>
          <CardDescription>
            Select which types of documents to import from Acumatica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeInvoices">Invoices</Label>
                <p className="text-xs text-muted-foreground">Standard sales invoices</p>
              </div>
              <Switch
                id="includeInvoices"
                checked={formData.includeInvoices}
                onCheckedChange={(checked) => setFormData({ ...formData, includeInvoices: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeCreditMemos">Credit Memos</Label>
                <p className="text-xs text-muted-foreground">Customer refunds and returns</p>
              </div>
              <Switch
                id="includeCreditMemos"
                checked={formData.includeCreditMemos}
                onCheckedChange={(checked) => setFormData({ ...formData, includeCreditMemos: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeDebitMemos">Debit Memos</Label>
                <p className="text-xs text-muted-foreground">Additional charges to customers</p>
              </div>
              <Switch
                id="includeDebitMemos"
                checked={formData.includeDebitMemos}
                onCheckedChange={(checked) => setFormData({ ...formData, includeDebitMemos: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Filtering */}
      <Card className="border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-cyan-600" />
            <CardTitle>Branch Filtering</CardTitle>
          </div>
          <CardDescription>
            Filter invoices by branch/location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formData.branchFilterMode}
            onValueChange={(value: string) => setFormData({ ...formData, branchFilterMode: value as 'ALL' | 'SELECTED' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ALL" id="branch-all" />
              <Label htmlFor="branch-all" className="font-normal">
                Import from all branches
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SELECTED" id="branch-selected" />
              <Label htmlFor="branch-selected" className="font-normal">
                Import from specific branches only
              </Label>
            </div>
          </RadioGroup>

          {formData.branchFilterMode === 'SELECTED' && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="selectedBranches">Branch IDs (comma-separated)</Label>
              <Textarea
                id="selectedBranches"
                placeholder="MAIN, WAREHOUSE1, RETAIL"
                value={branchesText}
                onChange={(e) => setBranchesText(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Enter branch IDs separated by commas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Settings */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-600" />
            <CardTitle>Import Settings</CardTitle>
          </div>
          <CardDescription>
            Configure how invoice data is imported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Import Level */}
          <div className="space-y-3">
            <Label>Import Level</Label>
            <RadioGroup
              value={formData.importLevel}
              onValueChange={(value: string) => setFormData({ ...formData, importLevel: value as 'INVOICE_TOTAL' | 'LINE_LEVEL' })}
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="INVOICE_TOTAL" id="import-invoice" />
                <div className="space-y-0.5">
                  <Label htmlFor="import-invoice" className="font-normal">
                    Invoice Total (Recommended)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    One sale record per invoice
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="LINE_LEVEL" id="import-line" />
                <div className="space-y-0.5">
                  <Label htmlFor="import-line" className="font-normal">
                    Line Level
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    One sale record per invoice line item
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Invoice Amount Field */}
          {formData.importLevel === 'INVOICE_TOTAL' && (
            <div className="space-y-2">
              <Label htmlFor="invoiceAmountField">Invoice Amount Field</Label>
              <Select
                value={formData.invoiceAmountField}
                onValueChange={(value) => setFormData({ ...formData, invoiceAmountField: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AMOUNT">Amount (Before Tax) - Recommended</SelectItem>
                  <SelectItem value="DOC_TOTAL">Document Total (Includes Tax & Freight)</SelectItem>
                  <SelectItem value="LINES_TOTAL">Lines Total (Sum of Line Amounts)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Line Amount Field */}
          {formData.importLevel === 'LINE_LEVEL' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="lineAmountField">Line Amount Field</Label>
                <Select
                  value={formData.lineAmountField}
                  onValueChange={(value) => setFormData({ ...formData, lineAmountField: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXTENDED_PRICE">Extended Price (Qty × Unit Price)</SelectItem>
                    <SelectItem value="AMOUNT">Amount (After Discounts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Line Filter Mode */}
              <div className="space-y-3">
                <Label>Line Item Filtering</Label>
                <RadioGroup
                  value={formData.lineFilterMode}
                  onValueChange={(value: string) => setFormData({ ...formData, lineFilterMode: value as 'ALL' | 'ITEM_CLASS' | 'GL_ACCOUNT' })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ALL" id="line-all" />
                    <Label htmlFor="line-all" className="font-normal">
                      Import all line items
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ITEM_CLASS" id="line-class" />
                    <Label htmlFor="line-class" className="font-normal">
                      Filter by item class
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="GL_ACCOUNT" id="line-gl" />
                    <Label htmlFor="line-gl" className="font-normal">
                      Filter by GL account
                    </Label>
                  </div>
                </RadioGroup>

                {formData.lineFilterMode !== 'ALL' && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="lineFilterValues">
                      {formData.lineFilterMode === 'ITEM_CLASS' ? 'Item Classes' : 'GL Accounts'} (comma-separated)
                    </Label>
                    <Textarea
                      id="lineFilterValues"
                      placeholder={formData.lineFilterMode === 'ITEM_CLASS' ? 'PRODUCT, SERVICE, HARDWARE' : '4000, 4100, 4200'}
                      value={lineFilterText}
                      onChange={(e) => setLineFilterText(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer & Project Handling */}
      <Card className="border-indigo-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <CardTitle>Customer & Project Handling</CardTitle>
          </div>
          <CardDescription>
            Configure how customers and projects are managed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Handling */}
          <div className="space-y-3">
            <Label>Customer Handling</Label>
            <RadioGroup
              value={formData.customerHandling}
              onValueChange={(value: string) => setFormData({ ...formData, customerHandling: value as 'AUTO_CREATE' | 'SKIP' })}
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="AUTO_CREATE" id="customer-auto" />
                <div className="space-y-0.5">
                  <Label htmlFor="customer-auto" className="font-normal">
                    Auto-create missing customers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create customers in CommissionFlow if they don't exist
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="SKIP" id="customer-skip" />
                <div className="space-y-0.5">
                  <Label htmlFor="customer-skip" className="font-normal">
                    Skip invoices with unknown customers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only import invoices for existing customers
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Customer ID Source */}
          <div className="space-y-2">
            <Label htmlFor="customerIdSource">Customer ID Source</Label>
            <Select
              value={formData.customerIdSource}
              onValueChange={(value) => setFormData({ ...formData, customerIdSource: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER_CD">Customer CD (Visual ID)</SelectItem>
                <SelectItem value="BACCOUNT_ID">BAccount ID (Internal ID)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Handling */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="projectAutoCreate">Auto-create projects</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically create projects from Acumatica
                </p>
              </div>
              <Switch
                id="projectAutoCreate"
                checked={formData.projectAutoCreate}
                onCheckedChange={(checked) => setFormData({ ...formData, projectAutoCreate: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="noProjectHandling">Invoices Without Projects</Label>
              <Select
                value={formData.noProjectHandling}
                onValueChange={(value) => setFormData({ ...formData, noProjectHandling: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_PROJECT">Create sale without project</SelectItem>
                  <SelectItem value="DEFAULT_PROJECT">Create/use default project per customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Data Storage */}
      {formData.importLevel === 'LINE_LEVEL' && (
        <Card className="border-violet-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-violet-600" />
              <CardTitle>Additional Line Data Storage</CardTitle>
            </div>
            <CardDescription>
              Choose which additional fields to store with each line item
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="storeItemId">Item ID</Label>
              <Switch
                id="storeItemId"
                checked={formData.storeItemId}
                onCheckedChange={(checked) => setFormData({ ...formData, storeItemId: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="storeItemDescription">Item Description</Label>
              <Switch
                id="storeItemDescription"
                checked={formData.storeItemDescription}
                onCheckedChange={(checked) => setFormData({ ...formData, storeItemDescription: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="storeItemClass">Item Class</Label>
              <Switch
                id="storeItemClass"
                checked={formData.storeItemClass}
                onCheckedChange={(checked) => setFormData({ ...formData, storeItemClass: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="storeGLAccount">GL Account</Label>
              <Switch
                id="storeGLAccount"
                checked={formData.storeGLAccount}
                onCheckedChange={(checked) => setFormData({ ...formData, storeGLAccount: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="storeQtyAndPrice">Quantity and Price</Label>
              <Switch
                id="storeQtyAndPrice"
                checked={formData.storeQtyAndPrice}
                onCheckedChange={(checked) => setFormData({ ...formData, storeQtyAndPrice: checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Schedule */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Sync Schedule</CardTitle>
          </div>
          <CardDescription>
            Configure automatic synchronization frequency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="syncFrequency">Sync Frequency</Label>
            <Select
              value={formData.syncFrequency}
              onValueChange={(value) => setFormData({ ...formData, syncFrequency: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual (On-Demand Only)</SelectItem>
                <SelectItem value="HOURLY">Hourly</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.syncFrequency === 'DAILY' || formData.syncFrequency === 'WEEKLY') && (
            <div className="space-y-2">
              <Label htmlFor="syncTime">Sync Time</Label>
              <Input
                id="syncTime"
                type="time"
                value={formData.syncTime || ''}
                onChange={(e) => setFormData({ ...formData, syncTime: e.target.value })}
              />
            </div>
          )}

          {formData.syncFrequency === 'WEEKLY' && (
            <div className="space-y-2">
              <Label htmlFor="syncDayOfWeek">Sync Day</Label>
              <Select
                value={formData.syncDayOfWeek?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, syncDayOfWeek: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Link href="/dashboard/integrations/acumatica/setup/salespeople">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Salespeople
          </Button>
        </Link>

        <Button
          onClick={handleSaveAndContinue}
          disabled={saving}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
