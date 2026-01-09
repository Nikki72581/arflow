import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type ExportData = {
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
  approvedDate: Date | null
  paidDate: Date | null
}

type DashboardStats = {
  totalSales: number
  salesCount: number
  totalCommissions: number
  commissionsCount: number
  averageCommissionRate: number
  pendingCommissions: number
  approvedCommissions: number
  paidCommissions: number
}

type Performer = {
  name: string
  email: string
  totalSales: number
  totalCommissions: number
  salesCount: number
  averageCommissionRate: number
}

export function exportToCSV(data: ExportData[], filename: string) {
  const csvRows = []

  // Headers
  const headers = [
    'Salesperson',
    'Email',
    'Sale Amount',
    'Commission Amount',
    'Commission %',
    'Sale Date',
    'Status',
    'Project',
    'Client',
    'Commission Plan',
    'Approved Date',
    'Paid Date',
  ]
  csvRows.push(headers.join(','))

  // Data rows
  data.forEach(row => {
    const values = [
      `"${row.salespersonName}"`,
      `"${row.salespersonEmail}"`,
      row.saleAmount.toFixed(2),
      row.commissionAmount.toFixed(2),
      row.commissionPercentage.toFixed(2),
      new Date(row.saleDate).toLocaleDateString(),
      row.status,
      `"${row.projectName}"`,
      `"${row.clientName}"`,
      `"${row.commissionPlan}"`,
      row.approvedDate ? new Date(row.approvedDate).toLocaleDateString() : '',
      row.paidDate ? new Date(row.paidDate).toLocaleDateString() : '',
    ]
    csvRows.push(values.join(','))
  })

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function exportToPDF(
  data: ExportData[],
  stats: DashboardStats | null,
  performers: Performer[],
  filename: string
) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Commission Report', 14, 22)

  // Date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  let yPos = 40

  // Summary Statistics
  if (stats) {
    doc.setFontSize(14)
    doc.text('Summary Statistics', 14, yPos)
    yPos += 8

    doc.setFontSize(10)
    const summaryData = [
      ['Total Sales', `$${stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Total Commissions', `$${stats.totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Average Rate', `${stats.averageCommissionRate.toFixed(2)}%`],
      ['Sales Count', stats.salesCount.toString()],
      ['Pending Commissions', `$${stats.pendingCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Approved Commissions', `$${stats.approvedCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Paid Commissions', `$${stats.paidCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Performers
  if (performers.length > 0) {
    doc.setFontSize(14)
    doc.text('Top Performers', 14, yPos)
    yPos += 8

    const performerData = performers.slice(0, 10).map((p, index) => [
      `#${index + 1}`,
      p.name,
      `$${p.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `$${p.totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      p.salesCount.toString(),
      `${p.averageCommissionRate.toFixed(2)}%`,
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Rank', 'Name', 'Total Sales', 'Commissions', 'Sales Count', 'Avg Rate']],
      body: performerData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Add new page for detailed data if needed
  if (data.length > 0) {
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Detailed Commission Data', 14, 20)

    const detailedData = data.map(row => [
      row.salespersonName,
      `$${row.saleAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `$${row.commissionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `${row.commissionPercentage.toFixed(2)}%`,
      new Date(row.saleDate).toLocaleDateString(),
      row.status,
    ])

    autoTable(doc, {
      startY: 28,
      head: [['Salesperson', 'Sale', 'Commission', 'Rate', 'Date', 'Status']],
      body: detailedData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
      styles: { fontSize: 8 },
    })
  }

  doc.save(`${filename}.pdf`)
}

export async function exportToExcel(
  data: ExportData[],
  stats: DashboardStats | null,
  performers: Performer[],
  filename: string
) {
  const workbook = XLSX.utils.book_new()

  // Summary Sheet
  if (stats) {
    const summaryData = [
      ['Commission Report Summary'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Sales', stats.totalSales],
      ['Total Commissions', stats.totalCommissions],
      ['Average Commission Rate', stats.averageCommissionRate / 100],
      ['Sales Count', stats.salesCount],
      ['Commissions Count', stats.commissionsCount],
      ['Pending Commissions', stats.pendingCommissions],
      ['Approved Commissions', stats.approvedCommissions],
      ['Paid Commissions', stats.paidCommissions],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // Format currency and percentage cells
    if (!summarySheet['!cols']) summarySheet['!cols'] = []
    summarySheet['!cols'][1] = { wch: 20 }

    // Apply number formats
    const currencyFormat = '$#,##0.00'
    const percentFormat = '0.00%'

    summarySheet['B5'].z = currencyFormat
    summarySheet['B6'].z = currencyFormat
    summarySheet['B7'].z = percentFormat
    summarySheet['B10'].z = currencyFormat
    summarySheet['B11'].z = currencyFormat
    summarySheet['B12'].z = currencyFormat

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  }

  // Top Performers Sheet
  if (performers.length > 0) {
    const performerData = [
      ['Top Performers'],
      [],
      ['Rank', 'Name', 'Email', 'Total Sales', 'Total Commissions', 'Sales Count', 'Avg Rate'],
      ...performers.map((p, index) => [
        index + 1,
        p.name,
        p.email,
        p.totalSales,
        p.totalCommissions,
        p.salesCount,
        p.averageCommissionRate / 100,
      ]),
    ]

    const performerSheet = XLSX.utils.aoa_to_sheet(performerData)

    // Set column widths
    performerSheet['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
    ]

    XLSX.utils.book_append_sheet(workbook, performerSheet, 'Top Performers')
  }

  // Detailed Data Sheet
  if (data.length > 0) {
    const detailedData = [
      ['Detailed Commission Data'],
      [],
      [
        'Salesperson',
        'Email',
        'Sale Amount',
        'Commission Amount',
        'Commission %',
        'Sale Date',
        'Status',
        'Project',
        'Client',
        'Commission Plan',
        'Approved Date',
        'Paid Date',
      ],
      ...data.map(row => [
        row.salespersonName,
        row.salespersonEmail,
        row.saleAmount,
        row.commissionAmount,
        row.commissionPercentage / 100,
        new Date(row.saleDate),
        row.status,
        row.projectName,
        row.clientName,
        row.commissionPlan,
        row.approvedDate ? new Date(row.approvedDate) : '',
        row.paidDate ? new Date(row.paidDate) : '',
      ]),
    ]

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)

    // Set column widths
    detailedSheet['!cols'] = [
      { wch: 20 }, // Salesperson
      { wch: 30 }, // Email
      { wch: 15 }, // Sale Amount
      { wch: 15 }, // Commission Amount
      { wch: 12 }, // Commission %
      { wch: 15 }, // Sale Date
      { wch: 12 }, // Status
      { wch: 20 }, // Project
      { wch: 20 }, // Client
      { wch: 20 }, // Commission Plan
      { wch: 15 }, // Approved Date
      { wch: 15 }, // Paid Date
    ]

    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Data')
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
