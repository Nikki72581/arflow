'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import {
  discoverGenericInquiries,
  selectDataSource,
  getDataSourceConfig,
} from '@/actions/integrations/acumatica/data-source';
import { getAcumaticaIntegration } from '@/actions/integrations/acumatica/connection';
import { DataSourceType } from '@prisma/client';

interface EntityOption {
  name: string;
  displayName: string;
  description: string;
  screenId?: string;
}

export default function DataSourceSelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [dataSourceType, setDataSourceType] = useState<DataSourceType>('GENERIC_INQUIRY');
  const [selectedEntity, setSelectedEntity] = useState<string>('');

  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);

  const [genericInquiries, setGenericInquiries] = useState<EntityOption[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<{
    dataSourceType: DataSourceType;
    dataSourceEntity: string;
  } | null>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      const integration = await getAcumaticaIntegration();
      if (!integration) {
        router.push('/dashboard/integrations/acumatica/setup');
        return;
      }

      setIntegrationId(integration.id);

      // Load existing configuration if available
      const config = await getDataSourceConfig(integration.id);
      if (config) {
        setCurrentConfig({
          dataSourceType: config.dataSourceType,
          dataSourceEntity: config.dataSourceEntity,
        });
        setDataSourceType(config.dataSourceType);
        setSelectedEntity(config.dataSourceEntity);
      }
    } catch (error) {
      console.error('Failed to load integration:', error);
      setError('Failed to load integration');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverDataSources = async () => {
    if (!integrationId) return;

    setDiscovering(true);
    setError(null);

    try {
      console.log('[Data Source Page] Starting Generic Inquiry discovery...');
      console.log('[Data Source Page] Integration ID:', integrationId);

      // Discover Generic Inquiries (the primary data source)
      const inquiries = await discoverGenericInquiries(integrationId);

      console.log('[Data Source Page] Discovery completed. Found inquiries:', inquiries.length);
      console.log('[Data Source Page] Inquiries:', inquiries);

      setGenericInquiries(
        inquiries.map((gi) => ({
          name: gi.name,
          displayName: gi.displayName || gi.name,
          description: gi.description || '',
        }))
      );

      // Auto-select GENERIC_INQUIRY type
      setDataSourceType('GENERIC_INQUIRY');

      if (inquiries.length === 0) {
        console.warn('[Data Source Page] No Generic Inquiries found');
        setError(
          'No Generic Inquiries found. Please ensure:\n\n' +
          '1. Generic Inquiry OData is enabled in Acumatica (SM207045)\n' +
          '2. You have created a Generic Inquiry in Acumatica (SM208000)\n' +
          '3. The "Expose via OData" checkbox is checked on your Generic Inquiry\n' +
          '4. You have saved the Generic Inquiry after checking the box\n' +
          '5. Your Acumatica user has permissions to access Generic Inquiries'
        );
      } else {
        console.log('[Data Source Page] Successfully found Generic Inquiries:',
          inquiries.map(i => i.name).join(', '));
      }
    } catch (error) {
      console.error('[Data Source Page] Failed to discover Generic Inquiries:', error);
      console.error('[Data Source Page] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      setError(
        error instanceof Error
          ? `Error: ${error.message}`
          : 'Failed to discover Generic Inquiries'
      );
    } finally {
      setDiscovering(false);
    }
  };

  const handleContinue = async () => {
    if (!integrationId || !selectedEntity) return;

    setSaving(true);
    setError(null);

    try {
      await selectDataSource(integrationId, dataSourceType, selectedEntity);
      router.push('/dashboard/integrations/acumatica/setup/field-mapping');
    } catch (error) {
      console.error('Failed to select data source:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to select data source'
      );
    } finally {
      setSaving(false);
    }
  };


  const availableEntities = genericInquiries;

  const canContinue = selectedEntity !== '';
  const hasDiscovered = genericInquiries.length > 0;

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
          Choose Your Data Source
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 2 of 7: Select where to retrieve invoice data from Acumatica
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: '28.57%' }}
        />
      </div>

      {/* Current Config Alert */}
      {currentConfig && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">
            Data source configured: {currentConfig.dataSourceType} - {currentConfig.dataSourceEntity}
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

      {/* Generic Inquiry Setup */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            <CardTitle>Generic Inquiry (OData)</CardTitle>
          </div>
          <CardDescription>
            CommissionFlow uses Generic Inquiries to retrieve invoice data from Acumatica.
            This provides maximum flexibility to match your specific Acumatica configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
            <h4 className="font-semibold text-sm mb-2">What you'll need:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">1.</span>
                <span>Create a Generic Inquiry in Acumatica that returns your invoice/commission data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">2.</span>
                <span>Publish the Generic Inquiry via OData in Acumatica</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">3.</span>
                <span>Click "Discover Generic Inquiries" below to see available inquiries</span>
              </li>
            </ul>
          </div>

          {genericInquiries.length === 0 && hasDiscovered && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                No Generic Inquiries found. Make sure you've created a Generic Inquiry in Acumatica and
                exposed it via OData. Check that Generic Inquiry OData is enabled in your Acumatica instance.
              </AlertDescription>
            </Alert>
          )}

          {/* Discover Button */}
          {!hasDiscovered && (
            <Button
              onClick={handleDiscoverDataSources}
              disabled={discovering}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {discovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discovering Generic Inquiries...
                </>
              ) : (
                'Discover Generic Inquiries'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Generic Inquiry Selection */}
      {hasDiscovered && availableEntities.length > 0 && (
        <Card className="border-purple-500/20">
          <CardHeader>
            <CardTitle>Select Generic Inquiry</CardTitle>
            <CardDescription>
              Choose which Generic Inquiry to use as your data source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedEntity} onValueChange={setSelectedEntity}>
              <div className="space-y-3">
                {availableEntities.map((entity) => (
                  <div
                    key={entity.name}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedEntity === entity.name
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-border hover:border-purple-500/50'
                    }`}
                    onClick={() => setSelectedEntity(entity.name)}
                  >
                    <RadioGroupItem value={entity.name} id={entity.name} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label
                          htmlFor={entity.name}
                          className="text-base font-semibold cursor-pointer"
                        >
                          {entity.displayName}
                        </Label>
                        {entity.screenId && (
                          <span className="px-2 py-0.5 text-xs font-mono bg-muted/60 text-muted-foreground rounded">
                            {entity.screenId}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/integrations/acumatica/setup')}
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
              Continue to Field Mapping
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
