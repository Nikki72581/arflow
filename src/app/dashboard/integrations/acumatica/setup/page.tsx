"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  Search,
  Pencil,
} from "lucide-react";
import {
  testAcumaticaConnection,
  saveAcumaticaConnection,
  listAcumaticaCompanies,
  getAcumaticaIntegration,
} from "@/actions/integrations/acumatica/connection";

const API_VERSIONS = ["23.200.001", "24.100.001", "24.200.001", "25.100.001"];

export default function AcumaticaSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({
    instanceUrl: "",
    apiVersion: "24.200.001",
    companyId: "",
    username: "",
    password: "",
  });

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{
    id: string;
    name: string;
  }> | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  // Load existing integration data on mount
  useEffect(() => {
    const loadIntegration = async () => {
      try {
        const integration = await getAcumaticaIntegration();
        if (integration) {
          console.log("[Client] Loaded existing integration:", {
            hasInstanceUrl: !!integration.instanceUrl,
            hasApiVersion: !!integration.apiVersion,
            hasCompanyId: !!integration.companyId,
            hasEncryptedCredentials: !!integration.encryptedCredentials,
          });

          setFormData({
            instanceUrl: integration.instanceUrl,
            apiVersion: integration.apiVersion,
            companyId: integration.companyId,
            username: "", // Don't pre-fill for security
            password: "", // User needs to re-enter to make changes
          });
          setIsConnected(integration.status === "ACTIVE");

          // Show info that credentials are saved
          if (integration.encryptedCredentials) {
            setTestResult({
              success: true,
              error: undefined,
            });
          }
        }
      } catch (error) {
        console.error("[Client] Failed to load integration:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIntegration();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear test result when form changes
    if (testResult) {
      setTestResult(null);
    }
    // Clear available companies if changing credentials
    if (["instanceUrl", "apiVersion", "username", "password"].includes(field)) {
      setAvailableCompanies(null);
    }
  };

  const handleEditCredentials = () => {
    setIsEditing(true);
    setTestResult(null);
  };

  const handleFetchCompanies = async () => {
    setFetchingCompanies(true);
    setAvailableCompanies(null);
    setTestResult(null);

    try {
      const result = await listAcumaticaCompanies({
        instanceUrl: formData.instanceUrl,
        apiVersion: formData.apiVersion,
        username: formData.username,
        password: formData.password,
      });

      if (result.success && result.companies) {
        setAvailableCompanies(result.companies);
      } else {
        setTestResult({
          success: false,
          error: result.error || "Failed to fetch companies",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setFetchingCompanies(false);
    }
  };

  const handleTestConnection = async () => {
    console.log("[Client] handleTestConnection called");
    setTesting(true);
    setTestResult(null);

    try {
      console.log("[Client] Testing connection with:", {
        instanceUrl: formData.instanceUrl,
        apiVersion: formData.apiVersion,
        companyId: formData.companyId,
        username: formData.username,
        // Don't log password
      });

      console.log("[Client] Calling testAcumaticaConnection...");
      const result = await testAcumaticaConnection(formData);
      console.log("[Client] Test result received:", JSON.stringify(result));

      if (!result) {
        console.error("[Client] Result is null or undefined");
        const errorResult = {
          success: false as const,
          error: "No response from server",
        };
        setTestResult(errorResult);
        console.log("[Client] Set error result:", JSON.stringify(errorResult));
        return;
      }

      // Force a new object to ensure React detects the change
      const finalResult = {
        success: result.success,
        error: result.error,
      };
      console.log("[Client] Setting test result:", JSON.stringify(finalResult));
      setTestResult(finalResult);
      console.log("[Client] Test result state updated");
    } catch (error) {
      console.error("[Client] Test connection error:", error);
      const errorResult = {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
      setTestResult(errorResult);
      console.log(
        "[Client] Set exception result:",
        JSON.stringify(errorResult),
      );
    } finally {
      console.log("[Client] Setting testing to false");
      setTesting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);

    try {
      // If credentials are already saved and user hasn't entered new ones,
      // just navigate to the next step
      if (testResult?.success && !formData.username && !formData.password) {
        console.log(
          "[Client] Credentials already saved, proceeding to next step",
        );
        router.push("/dashboard/integrations/acumatica/setup/document-type");
        return;
      }

      // Otherwise, save the new/updated credentials
      const result = await saveAcumaticaConnection(formData);

      if (result.success) {
        // Navigate to next step (data source selection)
        router.push("/dashboard/integrations/acumatica/setup/document-type");
      } else {
        setTestResult({
          success: false,
          error: result.error || "Failed to save connection",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: "An unexpected error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid =
    formData.instanceUrl &&
    formData.apiVersion &&
    formData.companyId &&
    formData.username &&
    formData.password;

  const canProceed = testResult?.success === true;
  const credentialsSaved =
    testResult?.success && !formData.username && !formData.password;
  const fieldsDisabled = credentialsSaved && !isEditing;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Connect to Acumatica
        </h1>
        <p className="text-muted-foreground mt-2">
          Step 1 of 3: Enter your Acumatica instance credentials
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
          style={{ width: "33.33%" }}
        />
      </div>

      {isConnected && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">
            Acumatica is connected. Update credentials if needed or continue
            setup.
          </AlertDescription>
        </Alert>
      )}

      {/* Credentials Already Saved Banner */}
      {testResult?.success && !formData.username && !formData.password && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                Connection Configured
              </div>
              <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                Your Acumatica credentials are already saved and verified. You
                can proceed to configure your data source.
              </AlertDescription>
            </div>
            <Button
              onClick={() =>
                router.push(
                  "/dashboard/integrations/acumatica/setup/document-type",
                )
              }
              className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-shrink-0"
            >
              Continue to Document Types
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>
                Enter your Acumatica instance details. You can find these in
                your Acumatica admin panel.
              </CardDescription>
            </div>
            {credentialsSaved && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditCredentials}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instance URL */}
          <div className="space-y-2">
            <Label htmlFor="instanceUrl">
              Instance URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="instanceUrl"
              type="url"
              placeholder="https://yourcompany.acumatica.com"
              value={formData.instanceUrl}
              onChange={(e) => handleInputChange("instanceUrl", e.target.value)}
              disabled={fieldsDisabled}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              The full URL of your Acumatica instance (must use HTTPS)
            </p>
          </div>

          {/* API Version */}
          <div className="space-y-2">
            <Label htmlFor="apiVersion">
              API Version <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.apiVersion}
              onValueChange={(value) => handleInputChange("apiVersion", value)}
              disabled={fieldsDisabled}
            >
              <SelectTrigger disabled={fieldsDisabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {API_VERSIONS.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select the API version that matches your Acumatica instance
            </p>
          </div>

          {/* Company ID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="companyId">
                Company ID <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchCompanies}
                disabled={
                  fieldsDisabled ||
                  !formData.instanceUrl ||
                  !formData.apiVersion ||
                  !formData.username ||
                  !formData.password ||
                  fetchingCompanies
                }
                className="text-xs h-7"
              >
                {fetchingCompanies ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Search className="mr-1 h-3 w-3" />
                    Find Company IDs
                  </>
                )}
              </Button>
            </div>
            <Input
              id="companyId"
              placeholder="MYCOMPANY"
              value={formData.companyId}
              onChange={(e) => handleInputChange("companyId", e.target.value)}
              disabled={fieldsDisabled}
            />
            <p className="text-sm text-muted-foreground">
              Your Acumatica tenant/company identifier. Click "Find Company IDs"
              to try retrieving available companies (may not work on all
              Acumatica instances).
            </p>

            {/* Show help if fetch fails */}
            {testResult &&
              !testResult.success &&
              testResult.error?.includes("500") && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium text-sm">
                        Unable to automatically fetch companies.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Common Company ID formats:
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>
                          Company name (e.g., "Production", "Test", "Live")
                        </li>
                        <li>Abbreviated name (e.g., "PROD", "DEV", "QA")</li>
                        <li>Your organization name</li>
                        <li>
                          Check your Acumatica login screen for the company
                          dropdown
                        </li>
                        <li>
                          Ask your Acumatica administrator for the tenant name
                        </li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

            {/* Show available companies */}
            {availableCompanies && availableCompanies.length > 0 && (
              <Alert className="border-indigo-500/50 bg-indigo-500/10">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Available Companies:</p>
                    <div className="space-y-1">
                      {availableCompanies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() =>
                            handleInputChange("companyId", company.id)
                          }
                          className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-indigo-500/20 transition-colors"
                        >
                          <div className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                            {company.id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {company.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">
              Username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              autoComplete="username"
              placeholder={fieldsDisabled ? "••••••••" : "admin"}
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              disabled={fieldsDisabled}
            />
            <p className="text-sm text-muted-foreground">
              {fieldsDisabled
                ? "Username is securely saved"
                : "API user with access to Sales Invoice, Sales Order, and Customer endpoints"}
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={fieldsDisabled ? "••••••••" : ""}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={fieldsDisabled}
            />
            <p className="text-sm text-muted-foreground">
              {fieldsDisabled
                ? "Password is securely encrypted and saved"
                : "Password will be encrypted and stored securely"}
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert
              variant={testResult.success ? "default" : "destructive"}
              className={
                testResult.success
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : ""
              }
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5" />
                )}
                <AlertDescription>
                  {testResult.success &&
                  !formData.username &&
                  !formData.password
                    ? "Credentials saved! Enter username and password to update or proceed to the next step."
                    : testResult.success
                      ? "Connection successful! You can proceed to the next step."
                      : `Connection failed: ${testResult.error}`}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleTestConnection}
              disabled={fieldsDisabled || !isFormValid || testing}
              variant="outline"
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            <Button
              onClick={handleSaveAndContinue}
              disabled={(!canProceed && !credentialsSaved) || saving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardHeader>
          <CardTitle className="text-lg">
            Need Help Finding Your Credentials?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Instance URL:</strong> This is the web address you use to
            access Acumatica (e.g., https://yourcompany.acumatica.com)
          </p>
          <p>
            <strong>API Version:</strong> Found in Acumatica under System → Web
            Services → Contract-Based API
          </p>
          <p>
            <strong>Company ID:</strong> The tenant name shown in the login
            screen or company selector
          </p>
          <p>
            <strong>Credentials:</strong> We recommend creating a dedicated API
            user with read-only access to Sales Order, Sales Invoice, and
            Customer screens
          </p>
          <div className="pt-3 mt-3 border-t border-blue-500/20">
            <p className="text-xs">
              <strong>Version Compatibility:</strong> This integration was
              developed and tested with Acumatica 2025 R1 (25.101.0153.5). Other
              versions may have different field availability or API behaviors.
              If you experience issues, verify your Acumatica version supports
              the required API endpoints.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
