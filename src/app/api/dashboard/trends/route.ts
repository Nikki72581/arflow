import { NextRequest, NextResponse } from 'next/server'
import { getCommissionTrends } from '@/app/actions/dashboard'
import { normalizeDateRange } from '@/lib/date-range'

export async function GET() {
  try {
    const result = await getCommissionTrends({ months: 12 }) // Last 12 months
    return NextResponse.json(result)
  } catch (error) {
    console.error('Commission trends API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commission trends' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateRange = normalizeDateRange(body.dateRange)
    const result = await getCommissionTrends({ dateRange })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Commission trends API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commission trends' },
      { status: 500 }
    )
  }
}
