import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type ExportData = {
  documentNumber: string
  customerName: string
  documentDate: string
  dueDate: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  status: string
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
  commissionsCount: number
  conversionRate: number
  outstandingBalance: number
}

export function exportToCSV(data: ExportData[], filename: string) {
  const csvRows = []

  // Headers
  const headers = [
    'Document Number',
    'Customer',
    'Document Date',
    'Due Date',
    'Total Amount',
    'Amount Paid',
    'Balance Due',
    'Status',
  ]
  csvRows.push(headers.join(','))

  // Data rows
  data.forEach(row => {
    const values = [
      `"${row.documentNumber}"`,
      `"${row.customerName}"`,
      row.documentDate,
      row.dueDate,
      row.totalAmount.toFixed(2),
      row.amountPaid.toFixed(2),
      row.balanceDue.toFixed(2),
      row.status,
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
  doc.text('AR Report', 14, 22)

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
      ['Total Invoices', `$${stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Total Outstanding', `$${stats.totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Collection Rate', `${stats.averageCommissionRate.toFixed(2)}%`],
      ['Invoice Count', stats.salesCount.toString()],
      ['Open Invoices', stats.pendingCommissions.toString()],
      ['Partial Payments', stats.approvedCommissions.toString()],
      ['Paid Invoices', stats.paidCommissions.toString()],
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
    doc.text('Top Customers', 14, yPos)
    yPos += 8

    const performerData = performers.slice(0, 10).map((p, index) => [
      `#${index + 1}`,
      p.name,
      `$${p.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `$${p.totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      p.commissionsCount.toString(),
      `${p.conversionRate.toFixed(2)}%`,
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Rank', 'Name', 'Total Invoices', 'Payments', 'Invoices', 'Collection Rate']],
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
    doc.text('Invoice Detail', 14, 20)

    const detailedData = data.map(row => [
      row.documentNumber,
      row.customerName,
      row.documentDate,
      row.dueDate,
      `$${row.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `$${row.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      row.status,
    ])

    autoTable(doc, {
      startY: 28,
      head: [['Document', 'Customer', 'Date', 'Due', 'Total', 'Balance', 'Status']],
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
      ['AR Report Summary'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total Invoices', stats.totalSales],
      ['Total Outstanding', stats.totalCommissions],
      ['Collection Rate', stats.averageCommissionRate / 100],
      ['Invoice Count', stats.salesCount],
      ['Outstanding Count', stats.commissionsCount],
      ['Open Invoices', stats.pendingCommissions],
      ['Partial Payments', stats.approvedCommissions],
      ['Paid Invoices', stats.paidCommissions],
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
      ['Top Customers'],
      [],
      ['Rank', 'Name', 'Email', 'Total Invoices', 'Payments', 'Invoices', 'Collection Rate'],
      ...performers.map((p, index) => [
        index + 1,
        p.name,
        p.email,
        p.totalSales,
        p.totalCommissions,
        p.commissionsCount,
        p.conversionRate / 100,
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
      ['Invoice Detail'],
      [],
      [
        'Document Number',
        'Customer',
        'Document Date',
        'Due Date',
        'Total Amount',
        'Amount Paid',
        'Balance Due',
        'Status',
      ],
      ...data.map(row => [
        row.documentNumber,
        row.customerName,
        row.documentDate,
        row.dueDate,
        row.totalAmount,
        row.amountPaid,
        row.balanceDue,
        row.status,
      ]),
    ]

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)

    // Set column widths
    detailedSheet['!cols'] = [
      { wch: 18 }, // Document Number
      { wch: 28 }, // Customer
      { wch: 14 }, // Document Date
      { wch: 14 }, // Due Date
      { wch: 14 }, // Total Amount
      { wch: 14 }, // Amount Paid
      { wch: 14 }, // Balance Due
      { wch: 12 }, // Status
    ]

    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Data')
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
