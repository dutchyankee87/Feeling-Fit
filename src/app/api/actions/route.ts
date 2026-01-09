import { NextRequest, NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { actions, members, leads } from '@/lib/db/schema'
import { eq, and, desc, lte } from 'drizzle-orm'
import { WhatsAppService } from '@/lib/services/whatsapp'

const queryClient = postgres(process.env.DATABASE_URL!)
const db = drizzle(queryClient)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gymId = searchParams.get('gymId')
    const status = searchParams.get('status') || 'pending'
    
    if (!gymId) {
      return NextResponse.json(
        { error: 'Gym ID required' },
        { status: 400 }
      )
    }

    // Get pending actions for today
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const pendingActions = await db.select({
      action: actions,
      member: members,
      lead: leads
    })
    .from(actions)
    .leftJoin(members, eq(actions.memberId, members.id))
    .leftJoin(leads, eq(actions.leadId, leads.id))
    .where(
      and(
        eq(actions.gymId, gymId),
        eq(actions.status, status as any),
        lte(actions.dueDate, today)
      )
    )
    .orderBy(desc(actions.priority), actions.dueDate)
    .limit(10)

    return NextResponse.json({
      success: true,
      actions: pendingActions.map(item => ({
        ...item.action,
        targetName: item.member 
          ? `${item.member.firstName} ${item.member.lastName}`
          : item.lead 
          ? `${item.lead.firstName} ${item.lead.lastName}`
          : 'Unknown',
        targetEmail: item.member?.email || item.lead?.email,
        targetPhone: item.member?.phone || item.lead?.phone
      }))
    })
  } catch (error: any) {
    console.error('Get actions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch actions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { actionId, outcome, completedBy } = body
    
    if (!actionId) {
      return NextResponse.json(
        { error: 'Action ID required' },
        { status: 400 }
      )
    }

    // Get action details
    const [action] = await db.select()
      .from(actions)
      .where(eq(actions.id, actionId))
      .limit(1)

    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    // If action type is WhatsApp, send the message
    if (action.type === 'whatsapp' && action.suggestedMessage) {
      const whatsapp = new WhatsAppService()
      
      // Get target phone number
      let phoneNumber = ''
      if (action.memberId) {
        const [member] = await db.select()
          .from(members)
          .where(eq(members.id, action.memberId))
          .limit(1)
        phoneNumber = member?.phone || ''
      } else if (action.leadId) {
        const [lead] = await db.select()
          .from(leads)
          .where(eq(leads.id, action.leadId))
          .limit(1)
        phoneNumber = lead?.phone || ''
      }

      if (phoneNumber) {
        await whatsapp.sendMessage({
          to: phoneNumber,
          body: action.suggestedMessage
        })
      }
    }

    // Update action status
    await db.update(actions)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy: completedBy || 'system',
        outcome: outcome || 'Message sent'
      })
      .where(eq(actions.id, actionId))

    return NextResponse.json({
      success: true,
      message: 'Action completed successfully'
    })
  } catch (error: any) {
    console.error('Complete action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete action' },
      { status: 500 }
    )
  }
}