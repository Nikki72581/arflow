// src/app/dashboard/admin/recalculate-commissions/page.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Search,
  Calculator
} from 'lucide-react'
import { format } from 'date-fns'
import {
  findCalculationsForRecalculation,
  bulkRecalculateCommissions,
  type RecalculationFilters,
  type CalculationPreview
} from '@/app/actions/commission-calculations'
import { getUsers } from '@/app/actions/users'
import { getCommissionPlans } from '@/app/actions/commission-plans'
import { getProjects } from '@/app/actions/projects'

interface FilterState {
  dateFrom: string
  dateTo: string
  userIds: string[]
  planIds: string[]
  projectIds: string[]
  statuses: ('PENDING' | 'CALCULATED')[]
}

export default function RecalculateCommissionsPage() {
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [preview, setPreview] = useState<CalculationPreview[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  // Filter options
  const [users, setUsers] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    userIds: [],
    planIds: [],
    projectIds: [],
    statuses: ['PENDING', 'CALCULATED'],
  })

  // Load filter options
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const [usersResult, plansResult, projectsResult] = await Promise.all([
        getUsers(),
        getCommissionPlans(),
        getProjects(),
      ])

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      }
      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data)
      }
      if (projectsResult.success && projectsResult.data) {
        setProjects(projectsResult.data)
      }
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }

  const handlePreview = async () => {
    setPreviewing(true)
    setError('')
    setSuccess('')
    setPreview([])

    try {
      const filterParams: RecalculationFilters = {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        userIds: filters.userIds.length > 0 ? filters.userIds : undefined,
        planIds: filters.planIds.length > 0 ? filters.planIds : undefined,
        projectIds: filters.projectIds.length > 0 ? filters.projectIds : undefined,
        statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
      }

      const result = await findCalculationsForRecalculation(filterParams)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to find calculations')
      }

      setPreview(result.data.calculations)
      setStatusCounts(result.data.statusCounts)

      if (result.data.total === 0) {
        setError('No calculations found matching your filters')
      }
    } catch (err: any) {
      console.error('Error previewing calculations:', err)
      setError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleRecalculate = async () => {
    if (preview.length === 0) {
      setError('Please preview calculations first')
      return
    }

    if (!confirm(`Are you sure you want to recalculate ${preview.length} commission(s)? This will update the commission amounts based on current plan rules.`)) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const filterParams: RecalculationFilters = {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        userIds: filters.userIds.length > 0 ? filters.userIds : undefined,
        planIds: filters.planIds.length > 0 ? filters.planIds : undefined,
        projectIds: filters.projectIds.length > 0 ? filters.projectIds : undefined,
        statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
      }

      const result = await bulkRecalculateCommissions(filterParams)

      if (!result.success) {
        throw new Error(result.error || 'Failed to recalculate commissions')
      }

      setSuccess(result.message || 'Recalculation completed successfully')

      // Show error details if any
      if (result.data?.errors && result.data.errors.length > 0) {
        setError(`Some errors occurred:\n${result.data.errors.join('\n')}`)
      }

      // Clear preview to force user to preview again
      setPreview([])
      setStatusCounts({})
    } catch (err: any) {
      console.error('Error recalculating commissions:', err)
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

  const togglePlan = (planId: string) => {
    setFilters(prev => ({
      ...prev,
      planIds: prev.planIds.includes(planId)
        ? prev.planIds.filter(id => id !== planId)
        : [...prev.planIds, planId]
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

  const toggleStatus = (status: 'PENDING' | 'CALCULATED') => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }))
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Recalculate Commissions
        </h1>
        <p className="text-muted-foreground">
          Recalculate commission amounts based on current plan rules. Only PENDING and CALCULATED commissions can be recalculated.
        </p>
      </div>

      {/* Warning Alert */}
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This utility will recalculate commission amounts using the current commission plan rules.
          Only commissions with PENDING or CALCULATED status will be updated.
          APPROVED and PAID commissions are locked and cannot be recalculated.
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
          <CardTitle>Filter Calculations</CardTitle>
          <CardDescription>
            Select which commissions to recalculate
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

          {/* Status Filter */}
          <div>
            <Label>Commission Status</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-pending"
                  checked={filters.statuses.includes('PENDING')}
                  onCheckedChange={() => toggleStatus('PENDING')}
                />
                <label
                  htmlFor="status-pending"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Pending
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-calculated"
                  checked={filters.statuses.includes('CALCULATED')}
                  onCheckedChange={() => toggleStatus('CALCULATED')}
                />
                <label
                  htmlFor="status-calculated"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Calculated
                </label>
              </div>
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

          {/* Commission Plans Filter */}
          <div>
            <Label>Commission Plans</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`plan-${plan.id}`}
                    checked={filters.planIds.includes(plan.id)}
                    onCheckedChange={() => togglePlan(plan.id)}
                  />
                  <label
                    htmlFor={`plan-${plan.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {plan.name}
                  </label>
                </div>
              ))}
              {plans.length === 0 && (
                <p className="text-sm text-muted-foreground">No commission plans found</p>
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
            onClick={handlePreview}
            disabled={previewing || loading}
            className="w-full"
          >
            {previewing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Preview Calculations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {preview.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preview Results</CardTitle>
              <CardDescription>
                {preview.length} calculation(s) will be recalculated
                {Object.keys(statusCounts).length > 0 && (
                  <span className="ml-2">
                    ({Object.entries(statusCounts).map(([status, count]) => (
                      <span key={status} className="ml-2">
                        {status}: {count}
                      </span>
                    ))})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Sale Amount</TableHead>
                      <TableHead>Current Commission</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((calc) => (
                      <TableRow key={calc.id}>
                        <TableCell>
                          {calc.user.firstName} {calc.user.lastName}
                        </TableCell>
                        <TableCell>
                          {calc.salesTransaction.invoiceNumber || 'N/A'}
                          {calc.project && (
                            <div className="text-xs text-muted-foreground">
                              {calc.project.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          ${calc.salesTransaction.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${calc.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {calc.commissionPlan.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={calc.status === 'PENDING' ? 'secondary' : 'outline'}>
                            {calc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(calc.salesTransaction.transactionDate), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleRecalculate}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Recalculate {preview.length} Commission(s)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
