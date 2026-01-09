import { NextRequest, NextResponse } from 'next/server'
import { CRMSyncService } from '@/lib/services/crm-sync'
import { RiskEngine } from '@/lib/services/risk-engine'

export async function POST(request: NextRequest) {
  try {
    const { gymId } = await request.json()
    
    if (!gymId) {
      return NextResponse.json(
        { error: 'Gym ID required' },
        { status: 400 }
      )
    }

    // Initialize services
    const crmSync = new CRMSyncService({
      apiUrl: process.env.CRM_API_URL!,
      apiKey: process.env.CRM_API_KEY!,
      gymId
    })

    const riskEngine = new RiskEngine()

    // Run sync
    console.log('Starting CRM sync for gym:', gymId)
    await crmSync.runFullSync()
    
    // Calculate risk scores
    console.log('Calculating risk scores...')
    await riskEngine.calculateAllMemberRisks(gymId)
    
    // Detect patterns
    console.log('Detecting patterns...')
    await riskEngine.detectPatterns(gymId)

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger sync',
    endpoints: {
      sync: 'POST /api/sync',
      params: { gymId: 'string' }
    }
  })
}