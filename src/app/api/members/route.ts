import { NextResponse } from 'next/server'
import { fetchMembers, getStats } from '@/lib/services/google-sheets-sync'

export const revalidate = 300 // Cache for 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'all', 'at-risk', 'critical'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const members = await fetchMembers()
    const stats = await getStats()

    let filteredMembers = members

    if (filter === 'at-risk') {
      filteredMembers = members.filter(m =>
        m.riskLevel === 'high' || m.riskLevel === 'critical'
      )
    } else if (filter === 'critical') {
      filteredMembers = members.filter(m => m.riskLevel === 'critical')
    }

    return NextResponse.json({
      success: true,
      data: {
        members: filteredMembers.slice(0, limit),
        stats,
        totalFiltered: filteredMembers.length,
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch members'
      },
      { status: 500 }
    )
  }
}