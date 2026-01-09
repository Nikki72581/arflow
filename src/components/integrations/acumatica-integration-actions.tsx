'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Settings, ListOrdered, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { syncAcumaticaInvoices } from '@/actions/integrations/acumatica/sync'

interface AcumaticaIntegrationActionsProps {
  setupUrl: string
}

export function AcumaticaIntegrationActions({ setupUrl }: AcumaticaIntegrationActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncAcumaticaInvoices()
      if (result.success && result.summary) {
        // Refresh the page first to show updated lastSyncAt
        router.refresh()

        // Show success message after initiating refresh
        toast({
          title: 'Sync complete',
          description: `Created ${result.summary.salesCreated} sales, ${result.summary.clientsCreated} clients, ${result.summary.projectsCreated} projects.`,
        })
        return
      }

      toast({
        title: 'Sync failed',
        description: result.error || 'Unable to sync Acumatica data',
        variant: 'destructive',
      })
    })
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {isPending ? 'Syncing' : 'Sync Now'}
      </Button>
      <Link href={setupUrl}>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configure
        </Button>
      </Link>
      <Link href="/dashboard/integrations/acumatica/sync-logs">
        <Button variant="outline" size="sm" className="gap-2">
          <ListOrdered className="h-4 w-4" />
          Sync Logs
        </Button>
      </Link>
    </div>
  )
}
