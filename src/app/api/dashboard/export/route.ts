import { NextRequest, NextResponse } from 'next/server'
import { getCommissionExportData } from '@/app/actions/dashboard'
import { normalizeDateRange } from '@/lib/date-range'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateRange = normalizeDateRange(body.dateRange)

    const result = await getCommissionExportData(dateRange)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Export data API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch export data' },
      { status: 500 }
    )
  }
}
