import { requireAdmin } from '@/lib/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAcumaticaSyncLogs } from '@/actions/integrations/acumatica/sync'
import { AcumaticaSyncLogsClient } from '@/components/integrations/acumatica-sync-logs-client'

export const dynamic = 'force-dynamic'

export default async function AcumaticaSyncLogsPage() {
  await requireAdmin()

  const result = await getAcumaticaSyncLogs()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/integrations">Integrations</Link>
            <span>/</span>
            <Link href="/dashboard/integrations/acumatica/setup">Acumatica</Link>
            <span>/</span>
            <span>Sync Logs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Acumatica Sync Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Review recent sync runs, imported records, and undo a sync if needed.
          </p>
        </div>
        <Link href="/dashboard/integrations">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Integrations
          </Button>
        </Link>
      </div>

      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>
                Logs are stored for every manual sync. Use undo to roll back unedited records.
              </CardDescription>
            </div>
            <Link href="/dashboard/integrations">
              <Button variant="ghost" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Start New Sync
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {result.success && result.logs?.length ? (
            <AcumaticaSyncLogsClient logs={result.logs} />
          ) : (
            <div className="text-sm text-muted-foreground">
              {result.success ? 'No sync logs available yet.' : result.error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
