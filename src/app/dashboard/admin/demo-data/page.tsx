// src/app/dashboard/admin/demo-data/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Building2, 
  FolderKanban, 
  DollarSign, 
  Receipt, 
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface GenerationStats {
  clients: number
  projects: number
  sales: number
  commissions: number
}

export default function DemoDataGeneratorPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [stats, setStats] = useState<GenerationStats | null>(null)
  const [error, setError] = useState<string>('')

  const generateClients = async (count: number) => {
    setLoading(true)
    setError('')
    setProgress(0)
    setStatus(`Generating ${count} clients...`)

    try {
      const response = await fetch('/api/admin/demo-data/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to generate clients'
        throw new Error(errorMsg)
      }

      setStats(prev => ({ ...prev!, clients: (prev?.clients || 0) + data.count }))
      setProgress(100)
      setStatus(`✅ Generated ${data.count} clients`)
    } catch (err: any) {
      console.error('Error generating clients:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateProjects = async (count: number) => {
    setLoading(true)
    setError('')
    setProgress(0)
    setStatus(`Generating ${count} projects...`)

    try {
      const response = await fetch('/api/admin/demo-data/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to generate projects'
        throw new Error(errorMsg)
      }

      setStats(prev => ({ ...prev!, projects: (prev?.projects || 0) + data.count }))
      setProgress(100)
      setStatus(`✅ Generated ${data.count} projects`)
    } catch (err: any) {
      console.error('Error generating projects:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateSalesAndCommissions = async (count: number) => {
    setLoading(true)
    setError('')
    setProgress(0)
    setStatus(`Generating ${count} sales with commissions...`)

    try {
      // Stream the progress
      const response = await fetch('/api/admin/demo-data/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error message from API
        const errorMsg = data.error || 'Failed to generate sales'
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : ''
        throw new Error(errorMsg + errorDetails)
      }

      setStats(prev => ({
        ...prev!,
        sales: (prev?.sales || 0) + data.salesCount,
        commissions: (prev?.commissions || 0) + data.commissionsCount
      }))
      setProgress(100)
      setStatus(`✅ Generated ${data.salesCount} sales and ${data.commissionsCount} commissions`)
    } catch (err: any) {
      console.error('Error generating sales:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateFullDataset = async () => {
    setLoading(true)
    setError('')
    setProgress(0)
    
    try {
      // Step 1: Clients
      setStatus('Step 1/3: Creating clients...')
      setProgress(10)
      await generateClients(20)
      setProgress(33)

      // Step 2: Projects
      setStatus('Step 2/3: Creating projects...')
      await generateProjects(30)
      setProgress(66)

      // Step 3: Sales & Commissions
      setStatus('Step 3/3: Creating sales and commissions...')
      await generateSalesAndCommissions(50)
      setProgress(100)

      setStatus('✅ Full demo dataset generated!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clearDemoData = async () => {
    if (!confirm('⚠️ This will delete ALL data for your organization including:\n\n• All clients and projects\n• All sales transactions\n• All commission calculations and payouts\n• All product categories and territories\n• Integration settings and sync logs\n• Placeholder users\n\nThis action cannot be undone. Are you sure?')) return

    setLoading(true)
    setError('')
    setStatus('Clearing all organization data...')

    try {
      const response = await fetch('/api/admin/demo-data/clear', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear data')
      }

      setStats({ clients: 0, projects: 0, sales: 0, commissions: 0 })
      setStatus('✅ All organization data cleared successfully')
    } catch (err: any) {
      console.error('Error clearing data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
          Demo Data Generator
        </h1>
        <p className="text-muted-foreground">
          Generate realistic test data for your organization. All data created will be associated with your current organization.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clients}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.commissions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress and Status */}
      {loading && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{status}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {!loading && status.startsWith('✅') && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Generate a complete dataset with one click
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateFullDataset} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Full Demo Dataset
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Creates 20 clients, 30 projects, 50 sales with commissions
          </p>
        </CardContent>
      </Card>

      {/* Individual Generators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Clients
            </CardTitle>
            <CardDescription>
              Generate client companies with contact info
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => generateClients(5)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 5 Clients
            </Button>
            <Button 
              onClick={() => generateClients(10)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 10 Clients
            </Button>
            <Button 
              onClick={() => generateClients(25)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 25 Clients
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projects
            </CardTitle>
            <CardDescription>
              Generate projects linked to clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => generateProjects(5)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 5 Projects
            </Button>
            <Button 
              onClick={() => generateProjects(15)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 15 Projects
            </Button>
            <Button 
              onClick={() => generateProjects(30)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 30 Projects
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Sales & Commissions
            </CardTitle>
            <CardDescription>
              Generate sales with automatic commission calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => generateSalesAndCommissions(10)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 10 Sales
            </Button>
            <Button 
              onClick={() => generateSalesAndCommissions(25)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 25 Sales
            </Button>
            <Button 
              onClick={() => generateSalesAndCommissions(50)} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Generate 50 Sales
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={clearDemoData}
            disabled={loading}
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Organization Data
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will delete ALL data for your organization including clients, projects, sales, commissions, territories, product categories, integrations, and placeholder users. This action cannot be undone.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
