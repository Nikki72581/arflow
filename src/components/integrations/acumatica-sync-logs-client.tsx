'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Loader2, RotateCcw, ChevronDown, ChevronRight, AlertCircle, XCircle, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { undoAcumaticaSync } from '@/actions/integrations/acumatica/sync'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'

interface SyncLogEntry {
  id: string
  syncType: string
  status: string
  startedAt: string
  completedAt: string | null
  undoneAt: string | null
  triggeredBy: {
    id: string
    name: string | null
    email: string | null
  } | null
  invoicesFetched: number
  invoicesProcessed: number
  invoicesSkipped: number
  salesCreated: number
  clientsCreated: number
  projectsCreated: number
  errorsCount: number
  skipDetails: Array<{ invoiceRef: string; reason: string; debugData?: unknown }> | null
  errorDetails: Array<{ invoiceRef: string; error: string }> | null
}

interface AcumaticaSyncLogsClientProps {
  logs: SyncLogEntry[]
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
  SUCCESS: 'success',
  PARTIAL_SUCCESS: 'secondary',
  FAILED: 'destructive',
  IN_PROGRESS: 'outline',
  STARTED: 'outline',
  UNDONE: 'default',
}

function SyncLogDetailsView({
  skipDetails,
  errorDetails
}: {
  skipDetails: Array<{ invoiceRef: string; reason: string; debugData?: unknown }> | null
  errorDetails: Array<{ invoiceRef: string; error: string }> | null
}) {
  const [skipSearchTerm, setSkipSearchTerm] = useState('')
  const [errorSearchTerm, setErrorSearchTerm] = useState('')

  const filteredSkips = skipDetails?.filter(
    (skip) =>
      skip.invoiceRef.toLowerCase().includes(skipSearchTerm.toLowerCase()) ||
      skip.reason.toLowerCase().includes(skipSearchTerm.toLowerCase())
  ) || []

  const filteredErrors = errorDetails?.filter(
    (error) =>
      error.invoiceRef.toLowerCase().includes(errorSearchTerm.toLowerCase()) ||
      error.error.toLowerCase().includes(errorSearchTerm.toLowerCase())
  ) || []

  const hasSkips = (skipDetails?.length ?? 0) > 0
  const hasErrors = (errorDetails?.length ?? 0) > 0

  if (!hasSkips && !hasErrors) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No errors or skipped records for this sync.
      </div>
    )
  }

  return (
    <Tabs defaultValue={hasErrors ? 'errors' : 'skipped'} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="errors" className="gap-2">
          <XCircle className="h-4 w-4" />
          Errors ({errorDetails?.length ?? 0})
        </TabsTrigger>
        <TabsTrigger value="skipped" className="gap-2">
          <AlertCircle className="h-4 w-4" />
          Skipped ({skipDetails?.length ?? 0})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="errors" className="mt-4">
        {hasErrors ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice reference or error..."
                value={errorSearchTerm}
                onChange={(e) => setErrorSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredErrors.length > 0 ? (
                filteredErrors.map((error, idx) => (
                  <Card key={idx} className="border-red-200 dark:border-red-900">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm font-medium text-red-700 dark:text-red-400">
                            {error.invoiceRef}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 break-words">
                            {error.error}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No errors match your search.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No errors occurred during this sync.
          </div>
        )}
      </TabsContent>

      <TabsContent value="skipped" className="mt-4">
        {hasSkips ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice reference or reason..."
                value={skipSearchTerm}
                onChange={(e) => setSkipSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredSkips.length > 0 ? (
                filteredSkips.map((skip, idx) => (
                  <Card key={idx} className="border-amber-200 dark:border-amber-900">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm font-medium text-amber-700 dark:text-amber-400">
                            {skip.invoiceRef}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 break-words">
                            {skip.reason}
                          </div>
                          {skip.debugData ? (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                Show Debug Data
                              </summary>
                              <pre className="mt-2 text-xs bg-muted/60 p-2 rounded overflow-x-auto max-h-96 overflow-y-auto border border-border">
                                {JSON.stringify(skip.debugData as Record<string, unknown>, null, 2)}
                              </pre>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No skipped records match your search.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No records were skipped during this sync.
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

export function AcumaticaSyncLogsClient({ logs }: AcumaticaSyncLogsClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const handleUndo = (logId: string) => {
    startTransition(async () => {
      const result = await undoAcumaticaSync(logId)
      if (result.success && result.data) {
        toast({
          title: 'Sync reverted',
          description: `Removed ${result.data.deletedSales} sales, ${result.data.deletedProjects} projects, ${result.data.deletedClients} clients.`,
        })
        router.refresh()
        return
      }

      toast({
        title: 'Unable to undo',
        description: result.error || 'Failed to undo sync',
        variant: 'destructive',
      })
    })
  }

  const toggleExpanded = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => {
        const isExpanded = expandedLogId === log.id
        const hasDetails = (log.skipDetails?.length ?? 0) > 0 || (log.errorDetails?.length ?? 0) > 0

        return (
          <div key={log.id} className="border rounded-lg overflow-hidden hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
            <button
              onClick={() => toggleExpanded(log.id)}
              className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              {/* Expand Icon */}
              <div className="flex-shrink-0">
                {hasDetails ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <div className="h-4 w-4" />
                )}
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                <Badge variant={STATUS_VARIANT[log.undoneAt ? 'UNDONE' : log.status] || 'outline'} className="text-xs">
                  {log.undoneAt ? 'UNDONE' : log.status}
                </Badge>
              </div>

              {/* Date & Time - Compact */}
              <div className="flex-shrink-0 min-w-[140px]">
                <div className="text-sm font-medium">
                  {format(new Date(log.startedAt), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(log.startedAt), 'h:mm a')}
                </div>
              </div>

              {/* Stats Summary - Compact */}
              <div className="flex-1 flex items-center gap-4 text-xs">
                <div>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{log.salesCreated}</span>
                  <span className="text-muted-foreground"> sales</span>
                </div>
                <div className="text-muted-foreground">•</div>
                <div>
                  <span className="font-medium">{log.invoicesProcessed}</span>
                  <span className="text-muted-foreground">/{log.invoicesFetched}</span>
                </div>
                {log.invoicesSkipped > 0 && (
                  <>
                    <div className="text-muted-foreground">•</div>
                    <div>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{log.invoicesSkipped}</span>
                      <span className="text-muted-foreground"> skipped</span>
                    </div>
                  </>
                )}
                {log.errorsCount > 0 && (
                  <>
                    <div className="text-muted-foreground">•</div>
                    <div>
                      <span className="font-medium text-red-600 dark:text-red-400">{log.errorsCount}</span>
                      <span className="text-muted-foreground"> errors</span>
                    </div>
                  </>
                )}
              </div>

              {/* User */}
              <div className="flex-shrink-0 text-xs text-muted-foreground min-w-[100px] text-right">
                {log.triggeredBy?.name || log.triggeredBy?.email || 'System'}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => handleUndo(log.id)}
                  disabled={
                    isPending ||
                    log.undoneAt !== null ||
                    (log.salesCreated + log.clientsCreated + log.projectsCreated === 0) ||
                    !['SUCCESS', 'PARTIAL_SUCCESS'].includes(log.status)
                  }
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Undo
                </Button>
              </div>
            </button>

            {isExpanded && hasDetails && (
              <div className="border-t bg-muted/30 p-4">
                <SyncLogDetailsView
                  skipDetails={log.skipDetails}
                  errorDetails={log.errorDetails}
                />
              </div>
            )}
          </div>
        )
      })}

      {logs.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No sync logs available yet.
        </div>
      )}
    </div>
  )
}
