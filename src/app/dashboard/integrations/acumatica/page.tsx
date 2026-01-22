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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  ArrowLeft,
  Database,
  Users,
  FileText,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { getAcumaticaIntegration } from "@/actions/integrations/acumatica/connection";
import {
  syncDocumentsFromAcumatica,
  getSyncHistory,
} from "@/actions/integrations/acumatica/sync-documents";
import {
  getPaymentConfigSettings,
  type PaymentConfigSettings,
} from "@/actions/integrations/acumatica/payment-config";
import { PaymentConfigForm } from "@/components/integrations/acumatica/payment-config-form";
import type { SyncStatus } from "@prisma/client";

interface SyncLog {
  id: string;
  syncType: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt: Date | null;
  invoicesFetched: number;
  invoicesProcessed: number;
  invoicesSkipped: number;
  documentsCreated: number;
  customersCreated: number;
  errorsCount: number;
}

interface Integration {
  id: string;
  status: string;
  instanceUrl: string;
  companyId: string;
  dataSourceEntity: string;
  lastSyncAt: Date | null;
  syncFrequency: string;
}

export default function AcumaticaDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [paymentConfig, setPaymentConfig] =
    useState<PaymentConfigSettings | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    summary?: {
      totalFetched: number;
      documentsCreated: number;
      documentsUpdated: number;
      documentsSkipped: number;
      customersCreated: number;
      errors: number;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const integrationData = await getAcumaticaIntegration();

      if (!integrationData) {
        router.push("/dashboard/integrations/acumatica/setup");
        return;
      }

      setIntegration(integrationData as Integration);

      // Load sync history and payment config in parallel
      const [history, paymentSettings] = await Promise.all([
        getSyncHistory(integrationData.id, 10),
        getPaymentConfigSettings(integrationData.id),
      ]);
      setSyncHistory(history as SyncLog[]);
      setPaymentConfig(paymentSettings);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load integration data");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!integration) return;

    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const result = await syncDocumentsFromAcumatica(integration.id);

      if (result.success) {
        setSyncResult({
          success: true,
          message: "Sync completed successfully!",
          summary: result.summary,
        });

        // Reload data to show updated sync history
        await loadData();
      } else {
        setSyncResult({
          success: false,
          message: result.error || "Sync failed",
        });
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setError(err instanceof Error ? err.message : "Failed to sync documents");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "PARTIAL_SUCCESS":
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!integration) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Acumatica Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your Acumatica connection and sync documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/integrations")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push("/dashboard/integrations/acumatica/setup")
            }
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${
                  integration.status === "ACTIVE"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              <div>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>
                  {integration.status === "ACTIVE"
                    ? "Connected and ready to sync"
                    : "Configuration incomplete"}
                </CardDescription>
              </div>
            </div>
            <Badge
              className={
                integration.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
              }
            >
              {integration.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Instance</div>
              <div className="font-mono text-sm truncate">
                {integration.instanceUrl.replace("https://", "")}
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Company</div>
              <div className="font-mono text-sm">{integration.companyId}</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">
                Document Type
              </div>
              <div className="font-mono text-sm">
                {integration.dataSourceEntity || "Not configured"}
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">
                Last Sync
              </div>
              <div className="text-sm">
                {integration.lastSyncAt
                  ? new Date(integration.lastSyncAt).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync Card */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-600" />
            <CardTitle>Manual Sync</CardTitle>
          </div>
          <CardDescription>
            Import documents from Acumatica into ARFlow. This will fetch
            invoices/orders based on your configuration and create or update
            corresponding documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sync Result Alert */}
          {syncResult && (
            <Alert
              className={
                syncResult.success
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-red-500/30 bg-red-500/10"
              }
            >
              {syncResult.success ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p
                    className={
                      syncResult.success
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }
                  >
                    {syncResult.message}
                  </p>
                  {syncResult.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Database className="h-4 w-4" />
                        <span>Fetched: {syncResult.summary.totalFetched}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>
                          Created: {syncResult.summary.documentsCreated}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RefreshCw className="h-4 w-4" />
                        <span>
                          Updated: {syncResult.summary.documentsUpdated}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>
                          New Customers: {syncResult.summary.customersCreated}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Skipped: {syncResult.summary.documentsSkipped}
                        </span>
                      </div>
                      {syncResult.summary.errors > 0 && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>Errors: {syncResult.summary.errors}</span>
                        </div>
                      )}
                    </div>
                  )}
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

          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={syncing || integration.status !== "ACTIVE"}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing Documents...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>

          {integration.status !== "ACTIVE" && (
            <p className="text-sm text-muted-foreground text-center">
              Complete the integration setup to enable syncing.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Configuration */}
      {integration.status === "ACTIVE" && (
        <PaymentConfigForm
          integrationId={integration.id}
          initialSettings={paymentConfig}
        />
      )}

      {/* Sync History */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <CardTitle>Sync History</CardTitle>
          </div>
          <CardDescription>Recent synchronization activity</CardDescription>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sync history yet</p>
              <p className="text-sm">
                Click "Sync Now" to import documents from Acumatica
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Fetched</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.syncType}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-right">
                        {log.invoicesFetched}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.documentsCreated}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.invoicesSkipped}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.errorsCount > 0 ? (
                          <span className="text-red-600">
                            {log.errorsCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
