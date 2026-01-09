'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DateRangePreset, 
  getDateRangeFromPreset, 
  formatDateRange,
  DateRange
} from '@/lib/date-range'

interface DateRangePickerProps {
  onRangeChange: (range: DateRange) => void
  defaultPreset?: DateRangePreset
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'lastQuarter', label: 'Last Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'allTime', label: 'All Time' },
]

export function DateRangePicker({ 
  onRangeChange, 
  defaultPreset = 'thisMonth' 
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(defaultPreset)
  const [currentRange, setCurrentRange] = useState<DateRange>(
    getDateRangeFromPreset(defaultPreset)
  )

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    const range = getDateRangeFromPreset(preset)
    setCurrentRange(range)
    onRangeChange(range)
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-sm text-muted-foreground hidden md:block">
        {formatDateRange(currentRange)}
      </div>
    </div>
  )
}
