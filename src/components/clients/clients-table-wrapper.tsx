'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TableWithPagination } from '@/components/ui/table-with-pagination'
import { ClientActions } from '@/components/clients/client-actions'
import { formatDate } from '@/lib/utils'

interface ClientsTableWrapperProps {
  clients: any[]
  territories: any[]
}

export function ClientsTableWrapper({ clients, territories }: ClientsTableWrapperProps) {
  return (
    <TableWithPagination
      data={clients}
      renderTable={(paginatedClients) => (
        <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                {territories.length > 0 && <TableHead className="font-semibold">Territory</TableHead>}
                <TableHead className="font-semibold">Projects</TableHead>
                <TableHead className="font-semibold">Added</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow
                  key={client.id}
                  data-testid="client-row"
                  className="hover:bg-purple-500/5 transition-colors border-b border-purple-500/5"
                >
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      data-testid="client-name"
                      className="font-medium text-purple-700 dark:text-purple-400 hover:underline hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      data-testid="client-status-badge"
                      variant={(client as any).status === 'ACTIVE' ? 'success' : (client as any).status === 'PROSPECTIVE' ? 'info' : (client as any).status === 'INACTIVE' ? 'secondary' : 'outline'}
                      className="font-medium"
                    >
                      {(client as any).status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.email || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.phone || '—'}
                  </TableCell>
                  {territories.length > 0 && (
                    <TableCell>
                      {(client as any).territory?.name ? (
                        <Badge variant="outline" className="border-purple-500/30 text-purple-700 dark:text-purple-400">
                          {(client as any).territory.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {client.projects.length > 0 ? (
                      <Badge
                        variant={client.projects.length > 5 ? 'success' : client.projects.length > 2 ? 'info' : 'secondary'}
                        className="font-semibold"
                      >
                        {client.projects.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ClientActions client={client} territories={territories} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    />
  )
}
