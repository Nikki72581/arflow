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
}

export function ClientsTableWrapper({ clients }: ClientsTableWrapperProps) {
  return (
    <TableWithPagination
      data={clients}
      renderTable={(paginatedClients) => (
        <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                <TableHead className="font-semibold">Company</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Invoices</TableHead>
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
                      {client.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      data-testid="client-status-badge"
                      variant={(client as any).status === 'ACTIVE' ? 'success' : (client as any).status === 'ON_HOLD' ? 'warning' : (client as any).status === 'COLLECTIONS' ? 'destructive' : 'secondary'}
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
                  <TableCell>
                    {(client._count?.arDocuments ?? 0) > 0 ? (
                      <Badge
                        variant={(client._count?.arDocuments ?? 0) > 5 ? 'success' : (client._count?.arDocuments ?? 0) > 2 ? 'info' : 'secondary'}
                        className="font-semibold"
                      >
                        {client._count?.arDocuments ?? 0}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ClientActions client={client} />
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
