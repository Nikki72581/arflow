// src/app/dashboard/admin/missing-commissions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Calculator,
  FileQuestion
} from 'lucide-react'
import { format } from 'date-fns'
import {
  findTransactionsWithoutCalculations,
  calculateMissingCommissions,
  type MissingCommissionFilters,
  type TransactionWithoutCalculation
} from '@/app/actions/commission-calculations'
import { getUsers } from '@/app/actions/users'
import { getProjects } from '@/app/actions/projects'

interface FilterState {
  dateFrom: string
  dateTo: string
  userIds: string[]
  projectIds: string[]
}

export default function MissingCommissionsPage() {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [transactions, setTransactions] = useState<TransactionWithoutCalculation[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])

  // Filter options
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    userIds: [],
    projectIds: [],
  })

  // Load filter options
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const [usersResult, projectsResult] = await Promise.all([
        getUsers(),
        getProjects(),
      ])

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      }
      if (projectsResult.success && projectsResult.data) {
        setProjects(projectsResult.data)
      }
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    setError('')
    setSuccess('')
    setTransactions([])
    setSelectedTransactions([])

    try {
      const filterParams: MissingCommissionFilters = {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        userIds: filters.userIds.length > 0 ? filters.userIds : undefined,
        projectIds: filters.projectIds.length > 0 ? filters.projectIds : undefined,
      }

      const result = await findTransactionsWithoutCalculations(filterParams)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to find transactions')
      }

      setTransactions(result.data.transactions)

      if (result.data.total === 0) {
        setSuccess('No transactions found without commission calculations')
      }
    } catch (err: any) {
      console.error('Error scanning transactions:', err)
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const handleCalculate = async () => {
    const toCalculate = selectedTransactions.length > 0
      ? selectedTransactions
      : transactions.map(t => t.id)

    if (toCalculate.length === 0) {
      setError('No transactions selected for calculation')
      return
    }

    if (!confirm(`Are you sure you want to calculate commissions for ${toCalculate.length} transaction(s)?`)) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await calculateMissingCommissions(toCalculate)

      if (!result.success) {
        throw new Error(result.error || 'Failed to calculate commissions')
      }

      setSuccess(result.message || 'Calculation completed successfully')

      // Show skipped details if any
      if (result.data?.skipped && result.data.skipped.length > 0) {
        const skippedDetails = result.data.skipped
          .map(s => `${s.transaction}: ${s.reason}`)
          .join('\n')
        console.log('Skipped transactions:', skippedDetails)
      }

      // Show error details if any
      if (result.data?.errors && result.data.errors.length > 0) {
        setError(`Some errors occurred:\n${result.data.errors.join('\n')}`)
      }

      // Refresh the scan to remove calculated transactions
      await handleScan()
    } catch (err: any) {
      console.error('Error calculating commissions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setFilters(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }))
  }

  const toggleProject = (projectId: string) => {
    setFilters(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }))
  }

  const toggleTransaction = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(transactions.map(t => t.id))
    }
  }

  const canCalculate = (reason: string) => {
    return reason === 'Missing calculation (plan exists)'
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Missing Commissions
        </h1>
        <p className="text-muted-foreground">
          Find and calculate commissions for sales transactions that don't have calculations yet.
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This utility scans for sales transactions without commission calculations. This can happen when:
          transactions are imported before commission plans are created, or when plans are added to projects after sales exist.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Scan Filters</CardTitle>
          <CardDescription>
            Select which transactions to scan for missing commissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom">Transaction Date From</Label>
              <input
                id="dateFrom"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Transaction Date To</Label>
              <input
                id="dateTo"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          {/* Salespeople Filter */}
          <div>
            <Label>Salespeople</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={filters.userIds.includes(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {user.firstName} {user.lastName}
                  </label>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">No salespeople found</p>
              )}
            </div>
          </div>

          {/* Projects Filter */}
          <div>
            <Label>Projects</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`project-${project.id}`}
                    checked={filters.projectIds.includes(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  />
                  <label
                    htmlFor={`project-${project.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                  >
                    {project.name}
                  </label>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground">No projects found</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleScan}
            disabled={scanning || loading}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Scan for Missing Commissions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {transactions.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scan Results</CardTitle>
                  <CardDescription>
                    {transactions.length} transaction(s) found without commission calculations
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Select All
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const calculable = canCalculate(transaction.reason)
                      return (
                        <TableRow key={transaction.id} className={!calculable ? 'opacity-50' : ''}>
                          <TableCell>
                            {calculable && (
                              <Checkbox
                                checked={selectedTransactions.includes(transaction.id)}
                                onCheckedChange={() => toggleTransaction(transaction.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {transaction.user.firstName} {transaction.user.lastName}
                          </TableCell>
                          <TableCell>
                            {transaction.invoiceNumber || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.project?.name || 'No project'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(transaction.transactionDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={calculable ? 'default' : 'secondary'}
                            >
                              {transaction.reason}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {transactions.some(t => canCalculate(t.reason)) && (
                <div className="mt-6 space-y-2">
                  <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    size="lg"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Calculate {selectedTransactions.length > 0 ? `${selectedTransactions.length} Selected` : 'All Calculable'} Commission(s)
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Only transactions with an active commission plan will be calculated
                  </p>
                </div>
              )}

              {!transactions.some(t => canCalculate(t.reason)) && (
                <Alert className="mt-6">
                  <FileQuestion className="h-4 w-4" />
                  <AlertDescription>
                    None of these transactions can be calculated automatically. They are either missing a commission plan or the plan is inactive.
                    Please create or activate commission plans for these salespeople/projects first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
