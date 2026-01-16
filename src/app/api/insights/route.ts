import { NextResponse } from 'next/server'
import { getMTInsights } from '@/lib/services/trainin-sync'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  try {
    const useTrainin = process.env.USE_TRAININ_API === 'true'

    if (!useTrainin) {
      return NextResponse.json(
        { success: false, error: 'MT Insights are only available with Trainin API' },
        { status: 400 }
      )
    }

    const insights = await getMTInsights()

    return NextResponse.json({
      success: true,
      data: insights,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('[API] Error fetching MT insights:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
