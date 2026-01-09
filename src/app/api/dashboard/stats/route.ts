import { NextRequest, NextResponse } from 'next/server'
import { getDashboardStats } from '@/app/actions/dashboard'
import { normalizeDateRange } from '@/lib/date-range'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateRange = normalizeDateRange(body.dateRange)

    const result = await getDashboardStats(dateRange)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
