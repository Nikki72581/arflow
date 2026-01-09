'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  UserCheck,
  UserX,
  UserPlus,
  Mail,
  User,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  fetchAcumaticaSalespeople,
  getSalespersonMappings,
  updateSalespersonMapping,
  saveSalespersonMappings,
} from '@/actions/integrations/acumatica/salespeople';
import { useToast } from '@/hooks/use-toast';

interface SalespersonMapping {
  id: string;
  acumaticaSalespersonId: string;
  acumaticaSalespersonName: string;
  acumaticaEmail: string | null;
  status: string;
  matchType: string | null;
  userId: string | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

interface AvailableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export default function SalespersonMappingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<SalespersonMapping[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    setLoading(true);
    const result = await getSalespersonMappings();
    if (result.success && result.mappings && result.availableUsers) {
      setMappings(result.mappings);
      setAvailableUsers(result.availableUsers);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load mappings',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleFetchSalespeople = async () => {
    setFetching(true);
    const result = await fetchAcumaticaSalespeople();
    if (result.success) {
      toast({
        title: 'Success',
        description: `Fetched ${result.salespeople?.length || 0} salespeople from Acumatica`,
      });
      await loadMappings();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to fetch salespeople',
        variant: 'destructive',
      });
    }
    setFetching(false);
  };

  const handleMapUser = async (mappingId: string, userId: string | null) => {
    const result = await updateSalespersonMapping({
      mappingId,
      userId,
      action: 'map',
    });

    if (result.success) {
      await loadMappings();
      toast({
        title: 'Success',
        description: 'Mapping updated successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update mapping',
        variant: 'destructive',
      });
    }
  };

  const handleIgnore = async (mappingId: string) => {
    const result = await updateSalespersonMapping({
      mappingId,
      userId: null,
      action: 'ignore',
    });

    if (result.success) {
      await loadMappings();
      toast({
        title: 'Success',
        description: 'Salesperson ignored',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to ignore salesperson',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    const result = await saveSalespersonMappings();
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Salesperson mappings saved successfully',
      });
      router.push('/dashboard/integrations/acumatica/setup/sync-settings');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save mappings',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const getUserDisplayName = (user: AvailableUser) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email;
  };

  const matchedCount = mappings.filter((m) => m.status === 'MATCHED').length;
  const placeholderCount = mappings.filter((m) => m.status === 'PLACEHOLDER').length;
  const ignoredCount = mappings.filter((m) => m.status === 'IGNORED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
          <span>Salespeople</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
              Map Salespeople
            </h1>
            <p className="text-muted-foreground mt-1">
              Step 6 of 7: Connect Acumatica salespeople to CommissionFlow users
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleFetchSalespeople}
            disabled={fetching}
            className="gap-2"
          >
            {fetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh from Acumatica
          </Button>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/20 p-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Matched to Users</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {matchedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/20 p-3">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Placeholder Users</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {placeholderCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted/60 p-3">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ignored</p>
                <p className="text-2xl font-bold text-foreground">
                  {ignoredCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardHeader>
          <CardTitle className="text-lg">How Salesperson Mapping Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Each active salesperson in Acumatica is automatically processed. You can review and adjust the mappings below.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-emerald-700 dark:text-emerald-400">Matched to User:</strong>
                <span className="text-muted-foreground ml-1">
                  Automatically matched by email to an existing user
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <UserPlus className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-blue-700 dark:text-blue-400">Create Placeholder User (Default):</strong>
                <span className="text-muted-foreground ml-1">
                  A placeholder user will be created. You can invite them later or manually map to an existing user.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <UserX className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-foreground">Ignored:</strong>
                <span className="text-muted-foreground ml-1">
                  Sales from this salesperson will not be imported
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            <strong>Note:</strong> Only active salespeople from Acumatica are shown. Inactive salespeople are automatically filtered out.
          </p>
        </CardContent>
      </Card>

      {/* Mappings List */}
      <Card>
        <CardHeader>
          <CardTitle>Salesperson Mappings</CardTitle>
          <CardDescription>
            {mappings.length === 0
              ? 'No salespeople found. Click "Refresh from Acumatica" to fetch them.'
              : `${mappings.length} salesperson${mappings.length === 1 ? '' : 'people'} found in Acumatica`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-background"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{mapping.acumaticaSalespersonName}</h4>
                      {mapping.acumaticaEmail && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {mapping.acumaticaEmail}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {mapping.acumaticaSalespersonId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  {/* Status Badge */}
                  {mapping.status === 'MATCHED' && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {mapping.matchType === 'AUTO_EMAIL' && 'Matched by Email'}
                      {mapping.matchType === 'MANUAL' && 'Manually Mapped'}
                    </Badge>
                  )}
                  {mapping.status === 'PLACEHOLDER' && (
                    <Badge className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                      <UserPlus className="h-3 w-3" />
                      {mapping.matchType === 'AUTO_PLACEHOLDER' && 'Create Placeholder'}
                      {mapping.matchType === 'MANUAL' && 'Create Placeholder'}
                    </Badge>
                  )}
                  {mapping.status === 'IGNORED' && (
                    <Badge variant="outline" className="gap-1">
                      <UserX className="h-3 w-3" />
                      Ignored
                    </Badge>
                  )}

                  {/* User Selection */}
                  {mapping.status !== 'IGNORED' && (
                    <Select
                      value={mapping.userId || 'placeholder'}
                      onValueChange={(value) =>
                        handleMapUser(mapping.id, value === 'placeholder' ? null : value)
                      }
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select mapping..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-blue-600" />
                            <span>Create Placeholder User</span>
                          </div>
                        </SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span>{getUserDisplayName(user)}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Ignore/Unignore Button */}
                  {mapping.status === 'IGNORED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMapUser(mapping.id, null)}
                      className="gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      Unignore
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleIgnore(mapping.id)}
                      className="gap-2"
                    >
                      <UserX className="h-4 w-4" />
                      Ignore
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {mappings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No salespeople found</p>
                <p className="text-sm mt-2">
                  Click "Refresh from Acumatica" to fetch salespeople from your Acumatica instance
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Link href="/dashboard/integrations/acumatica/setup">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Connection
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          {mappings.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {matchedCount} matched, {placeholderCount} placeholder{placeholderCount === 1 ? '' : 's'}, {ignoredCount} ignored
            </p>
          )}
          <Button
            onClick={handleSaveAndContinue}
            disabled={saving || mappings.length === 0}
            className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Save & Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
