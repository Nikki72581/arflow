'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  exportCommissionsToCSV, 
  CommissionExportData 
} from '@/lib/csv-export'
import { useToast } from '@/hooks/use-toast'

interface ExportButtonProps {
  data: CommissionExportData[]
  filename?: string
  label?: string
  disabled?: boolean
}

export function ExportButton({ 
  data, 
  filename, 
  label = 'Export CSV',
  disabled = false
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      if (data.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no commissions to export for the selected period.',
          variant: 'destructive',
        })
        return
      }

      exportCommissionsToCSV(data, filename)
      
      toast({
        title: 'Export successful',
        description: `Exported ${data.length} commission records to CSV.`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || data.length === 0}
      variant="outline"
      size="sm"
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? 'Exporting...' : label}
    </Button>
  )
}
