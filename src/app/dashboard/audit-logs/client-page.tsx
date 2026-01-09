'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  Eye,
  User,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  getAuditLogsWithFilters,
  getAuditUsers,
  exportAuditLogsToCsv,
  purgeAuditLogs,
  type AuditLogFilters,
} from '@/app/actions/audit-logs'
import type { AuditAction, EntityType } from '@/lib/audit-log'

interface AuditLog {
  id: string
  createdAt: Date
  userId: string | null
  userName: string | null
  userEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  description: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
}

const ACTION_LABELS: Record<string, string> = {
  commission_created: 'Commission Created',
  commission_approved: 'Commission Approved',
  commission_paid: 'Commission Paid',
  commission_rejected: 'Commission Rejected',
  bulk_payout_processed: 'Bulk Payout Processed',
  sale_created: 'Sale Created',
  sale_updated: 'Sale Updated',
  sale_deleted: 'Sale Deleted',
  plan_created: 'Plan Created',
  plan_updated: 'Plan Updated',
  plan_activated: 'Plan Activated',
  plan_deactivated: 'Plan Deactivated',
  user_invited: 'User Invited',
  user_role_changed: 'Role Changed',
  user_removed: 'User Removed',
  settings_updated: 'Settings Updated',
  integration_sync: 'Integration Sync',
  integration_sync_reverted: 'Integration Sync Reverted',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  commission: 'Commission',
  sale: 'Sale',
  plan: 'Plan',
  user: 'User',
  client: 'Client',
  project: 'Project',
  organization: 'Organization',
  settings: 'Settings',
  integration: 'Integration',
}

export default function AuditLogsClient() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Users for filter dropdown
  const [users, setUsers] = useState<Array<{ userId: string; userName: string | null; userEmail: string | null }>>([])

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Purge dialog
  const [showPurgeDialog, setShowPurgeDialog] = useState(false)
  const [purgeStartDate, setPurgeStartDate] = useState<string>('')
  const [purgeEndDate, setPurgeEndDate] = useState<string>('')
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false)
  const [purgeCount, setPurgeCount] = useState(0)

  // Load users for filter
  useEffect(() => {
    async function loadUsers() {
      const result = await getAuditUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      }
    }
    loadUsers()
  }, [])

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      const filters: AuditLogFilters = {
        page: currentPage,
        pageSize: 50,
      }

      if (selectedAction && selectedAction !== 'all') filters.action = selectedAction as AuditAction
      if (selectedEntityType && selectedEntityType !== 'all') filters.entityType = selectedEntityType as EntityType
      if (selectedUser && selectedUser !== 'all') filters.userId = selectedUser
      if (startDate) filters.startDate = new Date(startDate)
      if (endDate) filters.endDate = new Date(endDate)

      const result = await getAuditLogsWithFilters(filters)

      if (result.success && result.data) {
        setLogs(result.data.logs)
        setTotal(result.data.total)
        setTotalPages('totalPages' in result.data ? result.data.totalPages : 1)
      } else {
        toast({
          title: 'Error',
          description: 'error' in result ? result.error : 'Failed to load audit logs',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedAction, selectedEntityType, selectedUser, startDate, endDate, toast])

  useEffect(() => {
    loadAuditLogs()
  }, [loadAuditLogs])

  function handleClearFilters() {
    setSearchQuery('')
    setSelectedAction('all')
    setSelectedEntityType('all')
    setSelectedUser('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  async function handleExport() {
    startTransition(async () => {
      try {
        const filters: AuditLogFilters = {}

        if (selectedAction && selectedAction !== 'all') filters.action = selectedAction as AuditAction
        if (selectedEntityType && selectedEntityType !== 'all') filters.entityType = selectedEntityType as EntityType
        if (selectedUser && selectedUser !== 'all') filters.userId = selectedUser
        if (startDate) filters.startDate = new Date(startDate)
        if (endDate) filters.endDate = new Date(endDate)

        const result = await exportAuditLogsToCsv(filters)

        if (result.success && result.data && Array.isArray(result.data)) {
          // Convert to CSV
          const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address']
          const csvContent = [
            headers.join(','),
            ...result.data.map((log: any) =>
              [
                new Date(log.timestamp).toISOString(),
                log.user,
                log.email,
                log.action,
                log.entityType,
                log.entityId,
                `"${log.description.replace(/"/g, '""')}"`,
                log.ipAddress,
              ].join(',')
            ),
          ].join('\n')

          // Download
          const blob = new Blob([csvContent], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)

          toast({
            title: 'Success',
            description: 'Audit logs exported successfully',
          })
        } else {
          toast({
            title: 'Error',
            description: 'error' in result ? result.error : 'Failed to export logs',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to export logs',
          variant: 'destructive',
        })
      }
    })
  }

  async function handlePurgePreview() {
    if (!purgeStartDate && !purgeEndDate) {
      toast({
        title: 'Error',
        description: 'Please specify a date range for purging',
        variant: 'destructive',
      })
      return
    }

    // Count how many logs would be deleted
    const filters: AuditLogFilters = {}
    if (purgeStartDate) filters.startDate = new Date(purgeStartDate)
    if (purgeEndDate) filters.endDate = new Date(purgeEndDate)

    const result = await getAuditLogsWithFilters(filters)
    if (result.success && result.data) {
      setPurgeCount(result.data.total)
      setShowPurgeConfirm(true)
    }
  }

  async function handlePurgeConfirm() {
    startTransition(async () => {
      try {
        const result = await purgeAuditLogs({
          startDate: purgeStartDate ? new Date(purgeStartDate) : undefined,
          endDate: purgeEndDate ? new Date(purgeEndDate) : undefined,
        })

        if (result.success) {
          toast({
            title: 'Success',
            description: `Deleted ${result.data?.deletedCount || 0} audit log(s)`,
          })
          setShowPurgeDialog(false)
          setShowPurgeConfirm(false)
          setPurgeStartDate('')
          setPurgeEndDate('')
          loadAuditLogs()
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to purge logs',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to purge logs',
          variant: 'destructive',
        })
      }
    })
  }

  function viewLogDetails(log: AuditLog) {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.action.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs

  const hasActiveFilters = (selectedAction && selectedAction !== 'all') || (selectedEntityType && selectedEntityType !== 'all') || (selectedUser && selectedUser !== 'all') || startDate || endDate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Monitor and track all activities across your organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPurgeDialog(true)} disabled={isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Purge Logs
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit logs by action, entity type, user, or date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type Filter */}
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.userName || user.userEmail || 'Unknown User'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Page</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPage} / {totalPages}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hasActiveFilters ? 'Yes' : 'No'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <div className="text-muted-foreground">Loading audit logs...</div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs found"
          description={
            hasActiveFilters || searchQuery
              ? 'No logs match your search criteria. Try adjusting your filters.'
              : 'No audit logs have been recorded yet.'
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{log.userName || 'System'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ACTION_LABELS[log.action] || log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{log.description}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => viewLogDetails(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, total)} of {total} logs
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>Detailed information about this audit log entry</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedLog.userName || 'System'}</p>
                  {selectedLog.userEmail && <p className="text-sm text-muted-foreground">{selectedLog.userEmail}</p>}
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p className="font-medium">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity Type</Label>
                  <p className="font-medium">{ENTITY_TYPE_LABELS[selectedLog.entityType] || selectedLog.entityType}</p>
                </div>
                {selectedLog.entityId && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Entity ID</Label>
                    <p className="font-mono text-sm">{selectedLog.entityId}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="font-medium">{selectedLog.description}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <Label className="text-muted-foreground">IP Address</Label>
                    <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Metadata</Label>
                  <pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Purge Dialog */}
      <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Purge Audit Logs
            </DialogTitle>
            <DialogDescription>
              Permanently delete audit logs within a specific date range. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={purgeStartDate} onChange={(e) => setPurgeStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={purgeEndDate} onChange={(e) => setPurgeEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurgeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePurgePreview} disabled={!purgeStartDate && !purgeEndDate}>
              Preview Purge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation */}
      <AlertDialog open={showPurgeConfirm} onOpenChange={setShowPurgeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-bold text-destructive">{purgeCount}</span> audit log(s)
              {purgeStartDate && ` from ${format(new Date(purgeStartDate), 'MMM d, yyyy')}`}
              {purgeEndDate && ` to ${format(new Date(purgeEndDate), 'MMM d, yyyy')}`}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {purgeCount} Log(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
