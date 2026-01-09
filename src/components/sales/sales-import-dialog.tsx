'use client'

import { useState, useRef } from 'react'
import { Upload, FileUp, AlertCircle, CheckCircle2, X, ArrowRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

interface CSVColumn {
  name: string
  sampleValues: string[]
}

interface FieldMapping {
  csvColumn: string
  appField: string
}

interface ImportPreview {
  totalRows: number
  validRows: number
  errors: { row: number; message: string }[]
  previewData: any[]
}

const APP_FIELDS = [
  { value: 'amount', label: 'Sale Amount', required: true },
  { value: 'transactionDate', label: 'Sale Date', required: true },
  { value: 'userId', label: 'Salesperson Email', required: true },
  { value: 'projectId', label: 'Project Name', required: false },
  { value: 'clientId', label: 'Client Name', required: false },
  { value: 'invoiceNumber', label: 'Invoice Number', required: false },
  { value: 'description', label: 'Description', required: false },
  { value: 'transactionType', label: 'Transaction Type', required: false },
  { value: 'productCategoryId', label: 'Product Category', required: false },
] as const

interface SalesImportDialogProps {
  projects: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  users: Array<{ id: string; email: string; firstName: string; lastName: string }>
  productCategories: Array<{ id: string; name: string }>
  triggerClassName?: string
}

export function SalesImportDialog({
  projects,
  clients,
  users,
  productCategories,
  triggerClassName,
}: SalesImportDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload')
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      alert('CSV file must have at least a header row and one data row')
      return
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

    // Parse data rows
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: any = { _rowNumber: index + 2 } // +2 because header is row 1, and arrays are 0-indexed
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      return row
    })

    // Extract column info with sample values
    const columns: CSVColumn[] = headers.map(header => ({
      name: header,
      sampleValues: data.slice(0, 3).map(row => row[header]).filter(Boolean),
    }))

    setCsvData(data)
    setCsvColumns(columns)

    // Auto-suggest mappings based on column names
    const suggestedMappings = suggestFieldMappings(headers)
    setFieldMappings(suggestedMappings)

    setStep('mapping')
  }

  const suggestFieldMappings = (headers: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {}

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')

      // Amount mappings
      if (lowerHeader.includes('amount') || lowerHeader.includes('total') || lowerHeader.includes('price') || lowerHeader === 'sale') {
        mappings[header] = 'amount'
      }
      // Date mappings
      else if (lowerHeader.includes('date') || lowerHeader.includes('when')) {
        mappings[header] = 'transactionDate'
      }
      // Salesperson mappings
      else if (lowerHeader.includes('sales') && (lowerHeader.includes('person') || lowerHeader.includes('rep') || lowerHeader.includes('email'))) {
        mappings[header] = 'userId'
      }
      else if (lowerHeader.includes('email') && !lowerHeader.includes('client')) {
        mappings[header] = 'userId'
      }
      // Project mappings
      else if (lowerHeader.includes('project')) {
        mappings[header] = 'projectId'
      }
      // Client mappings
      else if (lowerHeader.includes('client') || lowerHeader.includes('customer') || lowerHeader.includes('account')) {
        mappings[header] = 'clientId'
      }
      // Invoice mappings
      else if (lowerHeader.includes('invoice') || lowerHeader.includes('inv')) {
        mappings[header] = 'invoiceNumber'
      }
      // Description mappings
      else if (lowerHeader.includes('description') || lowerHeader.includes('note') || lowerHeader.includes('memo')) {
        mappings[header] = 'description'
      }
      // Transaction type mappings
      else if (lowerHeader.includes('type')) {
        mappings[header] = 'transactionType'
      }
      // Product category mappings
      else if (lowerHeader.includes('product') || lowerHeader.includes('category')) {
        mappings[header] = 'productCategoryId'
      }
    })

    return mappings
  }

  const handleMapping = (csvColumn: string, appField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [csvColumn]: appField === 'none' ? '' : appField,
    }))
  }

  const validateAndPreview = () => {
    // Check required fields are mapped
    const requiredFields = APP_FIELDS.filter(f => f.required).map(f => f.value)
    const mappedFields = Object.values(fieldMappings).filter(Boolean)

    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field))
    if (missingRequired.length > 0) {
      alert(`Please map all required fields: ${missingRequired.join(', ')}`)
      return
    }

    // Validate data
    const errors: { row: number; message: string }[] = []
    const validRows: any[] = []

    const reverseMapping: Record<string, string> = {}
    Object.entries(fieldMappings).forEach(([csv, app]) => {
      if (app) reverseMapping[app] = csv
    })

    csvData.forEach((row, index) => {
      const rowErrors: string[] = []

      // Validate amount
      const amountCol = reverseMapping['amount']
      if (amountCol) {
        const amount = parseFloat(row[amountCol])
        if (isNaN(amount) || amount <= 0) {
          rowErrors.push('Invalid amount')
        }
      }

      // Validate date
      const dateCol = reverseMapping['transactionDate']
      if (dateCol) {
        const dateStr = row[dateCol]
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          rowErrors.push('Invalid date format')
        }
      }

      // Validate user exists
      const userCol = reverseMapping['userId']
      if (userCol) {
        const email = row[userCol]?.trim().toLowerCase()
        const userExists = users.some(u => u.email.toLowerCase() === email)
        if (!userExists) {
          rowErrors.push(`User not found: ${row[userCol]}`)
        }
      }

      // Note: We don't validate client existence here because clients will be auto-created

      if (rowErrors.length > 0) {
        errors.push({ row: row._rowNumber, message: rowErrors.join('; ') })
      } else {
        validRows.push(row)
      }
    })

    setPreview({
      totalRows: csvData.length,
      validRows: validRows.length,
      errors,
      previewData: validRows.slice(0, 5),
    })

    setStep('preview')
  }

  const handleImport = async () => {
    if (!preview) return

    setStep('importing')
    setImporting(true)
    setImportProgress(0)

    const reverseMapping: Record<string, string> = {}
    Object.entries(fieldMappings).forEach(([csv, app]) => {
      if (app) reverseMapping[app] = csv
    })

    let successCount = 0
    let failCount = 0

    // Process valid rows
    const validData = csvData.filter(row =>
      !preview.errors.some(e => e.row === row._rowNumber)
    )

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i]

      try {
        // Map CSV data to transaction data
        const transactionData: any = {}

        // Amount
        if (reverseMapping['amount']) {
          transactionData.amount = parseFloat(row[reverseMapping['amount']])
        }

        // Date
        if (reverseMapping['transactionDate']) {
          transactionData.transactionDate = new Date(row[reverseMapping['transactionDate']]).toISOString().split('T')[0]
        }

        // User - find by email
        if (reverseMapping['userId']) {
          const email = row[reverseMapping['userId']]?.trim().toLowerCase()
          const user = users.find(u => u.email.toLowerCase() === email)
          if (user) transactionData.userId = user.id
        }

        // Project - find by name
        if (reverseMapping['projectId']) {
          const projectName = row[reverseMapping['projectId']]?.trim()
          const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase())
          if (project) transactionData.projectId = project.id
        }

        // Client - find by name or pass name for auto-creation
        if (reverseMapping['clientId']) {
          const clientName = row[reverseMapping['clientId']]?.trim()
          if (clientName) {
            const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase())
            if (client) {
              transactionData.clientId = client.id
            } else {
              // Pass client name for automatic creation
              transactionData.clientName = clientName
            }
          }
        }

        // Product Category - find by name
        if (reverseMapping['productCategoryId']) {
          const categoryName = row[reverseMapping['productCategoryId']]?.trim()
          const category = productCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
          if (category) transactionData.productCategoryId = category.id
        }

        // Simple string fields
        if (reverseMapping['invoiceNumber']) {
          transactionData.invoiceNumber = row[reverseMapping['invoiceNumber']]
        }
        if (reverseMapping['description']) {
          transactionData.description = row[reverseMapping['description']]
        }
        if (reverseMapping['transactionType']) {
          const type = row[reverseMapping['transactionType']]?.toUpperCase()
          if (['SALE', 'RETURN', 'ADJUSTMENT'].includes(type)) {
            transactionData.transactionType = type
          }
        }

        // Call API to create transaction
        const response = await fetch('/api/sales/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
      }

      setImportProgress(((i + 1) / validData.length) * 100)
    }

    setImportResult({ success: successCount, failed: failCount })
    setImporting(false)

    // Refresh the page after a short delay
    setTimeout(() => {
      router.refresh()
      setOpen(false)
      resetDialog()
    }, 3000)
  }

  const resetDialog = () => {
    setStep('upload')
    setCsvData([])
    setCsvColumns([])
    setFieldMappings({})
    setPreview(null)
    setImportResult(null)
    setImportProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const headers = ['amount', 'transactionDate', 'salespersonEmail', 'projectName', 'clientName', 'invoiceNumber', 'description']
    const sampleRow = ['10000.00', '2024-01-15', 'john@example.com', 'Project Alpha', 'Acme Corp', 'INV-001', 'Q1 Sales']
    const csv = [headers.join(','), sampleRow.join(',')].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sales_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetDialog()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <Upload className="mr-2 h-4 w-4" />
          Import Sales
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Import Sales Transactions
          </DialogTitle>
          <DialogDescription>
            Import multiple sales transactions from a CSV file with flexible field mapping
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-2">Upload CSV File</p>
              <p className="text-xs text-muted-foreground mb-4">
                Select a CSV file containing your sales transactions
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs">
                <Download className="mr-1 h-3 w-3" />
                Download Template
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your CSV should include columns for amount, date, and salesperson email at minimum.
                The system will auto-detect and suggest field mappings in the next step.
                <strong className="block mt-1">New clients will be created automatically</strong> if they don't already exist.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                {csvData.length} rows detected
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Map your CSV columns to the appropriate fields. Required fields are marked with an asterisk.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {csvColumns.map((column) => (
                <div key={column.name} className="grid grid-cols-2 gap-4 items-start border-b pb-3">
                  <div>
                    <div className="font-medium text-sm mb-1">{column.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Samples: {column.sampleValues.slice(0, 2).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={fieldMappings[column.name] || 'none'}
                      onValueChange={(value) => handleMapping(column.name, value)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Don't import</SelectItem>
                        {APP_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label} {field.required && '*'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={validateAndPreview} className="flex-1">
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{preview.totalRows}</div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{preview.validRows}</div>
                <div className="text-xs text-muted-foreground">Valid</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{preview.errors.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <div className="font-medium mb-1">Found {preview.errors.length} errors:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {preview.errors.slice(0, 5).map((error, i) => (
                      <div key={i}>Row {error.row}: {error.message}</div>
                    ))}
                    {preview.errors.length > 5 && (
                      <div className="text-xs italic">...and {preview.errors.length - 5} more</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {preview.validRows > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Preview (first 5 valid rows):</p>
                <div className="border rounded-lg p-3 bg-muted/50 text-xs space-y-2 max-h-48 overflow-y-auto">
                  {preview.previewData.map((row, i) => (
                    <div key={i} className="border-b pb-2 last:border-b-0">
                      {Object.entries(fieldMappings)
                        .filter(([_, app]) => app)
                        .map(([csv, app]) => (
                          <div key={csv} className="flex justify-between">
                            <span className="text-muted-foreground">{app}:</span>
                            <span className="font-medium">{row[csv]}</span>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview.validRows === 0}
                className="flex-1"
              >
                Import {preview.validRows} Transaction{preview.validRows !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <FileUp className="h-16 w-16 mx-auto text-blue-600 animate-pulse mb-4" />
              <p className="text-lg font-medium mb-2">
                {importing ? 'Importing transactions...' : 'Import Complete!'}
              </p>
              <Progress value={importProgress} className="mb-4" />
              <p className="text-sm text-muted-foreground">
                {importing
                  ? `${Math.round(importProgress)}% complete`
                  : 'Redirecting...'}
              </p>
            </div>

            {importResult && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg text-center">
                  <X className="h-8 w-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
