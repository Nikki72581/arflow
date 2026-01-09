import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns'

export type DateRangePreset = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'allTime'

export interface DateRange {
  from: Date
  to: Date
}

export type SerializableDateRange = {
  from: Date | string
  to: Date | string
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return {
        from: today,
        to: now,
      }
    
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        from: yesterday,
        to: yesterday,
      }
    }
    
    case 'last7days': {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return {
        from: sevenDaysAgo,
        to: now,
      }
    }
    
    case 'last30days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return {
        from: thirtyDaysAgo,
        to: now,
      }
    }
    
    case 'thisMonth':
      return {
        from: startOfMonth(now),
        to: now,
      }
    
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    }
    
    case 'thisQuarter':
      return {
        from: startOfQuarter(now),
        to: now,
      }
    
    case 'lastQuarter': {
      const lastQuarter = subQuarters(now, 1)
      return {
        from: startOfQuarter(lastQuarter),
        to: endOfQuarter(lastQuarter),
      }
    }
    
    case 'thisYear':
      return {
        from: startOfYear(now),
        to: now,
      }
    
    case 'lastYear': {
      const lastYear = subYears(now, 1)
      return {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
      }
    }
    
    case 'allTime':
      return {
        from: new Date(2020, 0, 1), // Start from Jan 1, 2020
        to: now,
      }
    
    default:
      return {
        from: startOfMonth(now),
        to: now,
      }
  }
}

export function normalizeDateRange(range?: SerializableDateRange | null): DateRange | undefined {
  if (!range?.from || !range?.to) return undefined

  const from = range.from instanceof Date ? range.from : new Date(range.from)
  const to = range.to instanceof Date ? range.to : new Date(range.to)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined

  return { from, to }
}

export function formatDateRange(range: DateRange): string {
  const fromStr = range.from.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  })
  const toStr = range.to.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  })
  
  return `${fromStr} - ${toStr}`
}

export function isWithinDateRange(date: Date, range: DateRange): boolean {
  return date >= range.from && date <= range.to
}
