/**
 * CSV Export Utilities
 * Convert commission data to CSV format for payroll systems
 */

export interface CommissionExportData {
  salespersonName: string
  salespersonEmail: string
  saleDate: Date
  saleAmount: number
  commissionAmount: number
  commissionPercentage: number
  projectName: string
  clientName: string
  commissionPlan: string
  status: string
  approvedDate?: Date | null
  paidDate?: Date | null
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: CommissionExportData[]): string {
  if (data.length === 0) {
    return ''
  }

  // Define headers
  const headers = [
    'Salesperson Name',
    'Salesperson Email',
    'Sale Date',
    'Sale Amount',
    'Commission Amount',
    'Commission %',
    'Project',
    'Client',
    'Commission Plan',
    'Status',
    'Approved Date',
    'Paid Date',
  ]

  // Create CSV rows
  const rows = data.map((item) => {
    return [
      escapeCSV(item.salespersonName),
      escapeCSV(item.salespersonEmail),
      formatDate(item.saleDate),
      item.saleAmount.toFixed(2),
      item.commissionAmount.toFixed(2),
      item.commissionPercentage.toFixed(2),
      escapeCSV(item.projectName),
      escapeCSV(item.clientName),
      escapeCSV(item.commissionPlan),
      item.status,
      item.approvedDate ? formatDate(item.approvedDate) : '',
      item.paidDate ? formatDate(item.paidDate) : '',
    ].join(',')
  })

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Format date for CSV (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Generate filename with timestamp
 */
export function generateCSVFilename(prefix: string = 'commissions'): string {
  const now = new Date()
  const timestamp = now.toISOString().split('T')[0] // YYYY-MM-DD
  return `${prefix}_${timestamp}.csv`
}

/**
 * Export commissions to CSV and download
 */
export function exportCommissionsToCSV(
  data: CommissionExportData[],
  filename?: string
): void {
  const csv = convertToCSV(data)
  const csvFilename = filename || generateCSVFilename('commissions_export')
  downloadCSV(csv, csvFilename)
}

/**
 * Summary export with totals
 */
export interface CommissionSummaryData {
  salespersonName: string
  salespersonEmail: string
  totalSales: number
  totalCommissions: number
  averageCommissionRate: number
  salesCount: number
  pendingCommissions: number
  approvedCommissions: number
  paidCommissions: number
}

export function convertSummaryToCSV(data: CommissionSummaryData[]): string {
  if (data.length === 0) {
    return ''
  }

  const headers = [
    'Salesperson Name',
    'Salesperson Email',
    'Total Sales',
    'Total Commissions',
    'Avg Commission %',
    'Number of Sales',
    'Pending Commissions',
    'Approved Commissions',
    'Paid Commissions',
  ]

  const rows = data.map((item) => {
    return [
      escapeCSV(item.salespersonName),
      escapeCSV(item.salespersonEmail),
      item.totalSales.toFixed(2),
      item.totalCommissions.toFixed(2),
      item.averageCommissionRate.toFixed(2),
      item.salesCount.toString(),
      item.pendingCommissions.toFixed(2),
      item.approvedCommissions.toFixed(2),
      item.paidCommissions.toFixed(2),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Export summary to CSV
 */
export function exportSummaryToCSV(
  data: CommissionSummaryData[],
  filename?: string
): void {
  const csv = convertSummaryToCSV(data)
  const csvFilename = filename || generateCSVFilename('commission_summary')
  downloadCSV(csv, csvFilename)
}
