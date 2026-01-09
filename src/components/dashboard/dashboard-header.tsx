'use client'

import { DateRangePicker } from './date-range-picker'
import { ExportButton } from './export-button'

export function DashboardHeader() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your sales and commission performance
        </p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangePicker onRangeChange={() => {}} />
        <ExportButton data={[]} label="Export" />
      </div>
    </div>
  )
}
