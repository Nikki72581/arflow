import { NextRequest, NextResponse } from 'next/server'
import { getTopPerformers } from '@/app/actions/dashboard'
import { normalizeDateRange } from '@/lib/date-range'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateRange = normalizeDateRange(body.dateRange)

    const result = await getTopPerformers(dateRange, 10)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Top performers API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top performers' },
      { status: 500 }
    )
  }
}
