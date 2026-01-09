import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { members, leads, checkIns } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const queryClient = postgres(process.env.DATABASE_URL!)
const db = drizzle(queryClient)

interface CRMConfig {
  apiUrl: string
  apiKey: string
  gymId: string
}

interface CRMMember {
  id: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  join_date: string
  last_checkin?: string
  membership_type?: string
  status: 'active' | 'inactive' | 'cancelled'
}

interface CRMLead {
  id: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  source?: string
  created_at: string
  last_contact?: string
  status: 'new' | 'contacted' | 'trial' | 'converted' | 'lost'
}

interface CRMCheckIn {
  member_id: string
  checkin_time: string
  activity_type?: string
}

export class CRMSyncService {
  private config: CRMConfig

  constructor(config: CRMConfig) {
    this.config = config
  }

  private async fetchFromCRM<T>(endpoint: string): Promise<T[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`CRM API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Failed to fetch from CRM: ${endpoint}`, error)
      return []
    }
  }

  async syncMembers() {
    console.log('Starting member sync...')
    const crmMembers = await this.fetchFromCRM<CRMMember>('/members')
    
    for (const crmMember of crmMembers) {
      const memberData = {
        gymId: this.config.gymId,
        externalId: crmMember.id,
        email: crmMember.email,
        phone: crmMember.phone,
        firstName: crmMember.first_name,
        lastName: crmMember.last_name,
        status: this.mapMemberStatus(crmMember.status),
        joinDate: new Date(crmMember.join_date),
        lastCheckIn: crmMember.last_checkin ? new Date(crmMember.last_checkin) : null,
        membershipType: crmMember.membership_type,
        updatedAt: new Date()
      }

      await db.insert(members)
        .values(memberData)
        .onConflictDoUpdate({
          target: [members.externalId, members.gymId],
          set: memberData
        })
    }

    console.log(`Synced ${crmMembers.length} members`)
  }

  async syncLeads() {
    console.log('Starting lead sync...')
    const crmLeads = await this.fetchFromCRM<CRMLead>('/leads')
    
    for (const crmLead of crmLeads) {
      const leadData = {
        gymId: this.config.gymId,
        externalId: crmLead.id,
        email: crmLead.email,
        phone: crmLead.phone,
        firstName: crmLead.first_name,
        lastName: crmLead.last_name,
        source: crmLead.source,
        status: crmLead.status,
        firstContactDate: new Date(crmLead.created_at),
        lastContactDate: crmLead.last_contact ? new Date(crmLead.last_contact) : null,
        updatedAt: new Date()
      }

      await db.insert(leads)
        .values(leadData)
        .onConflictDoUpdate({
          target: [leads.externalId, leads.gymId],
          set: leadData
        })
    }

    console.log(`Synced ${crmLeads.length} leads`)
  }

  async syncCheckIns(days: number = 90) {
    console.log(`Starting check-in sync for last ${days} days...`)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const crmCheckIns = await this.fetchFromCRM<CRMCheckIn>(
      `/checkins?start_date=${startDate.toISOString()}`
    )
    
    for (const crmCheckIn of crmCheckIns) {
      const member = await db.select()
        .from(members)
        .where(eq(members.externalId, crmCheckIn.member_id))
        .limit(1)

      if (member.length > 0) {
        await db.insert(checkIns)
          .values({
            memberId: member[0].id,
            checkInTime: new Date(crmCheckIn.checkin_time),
            activityType: crmCheckIn.activity_type
          })
          .onConflictDoNothing()
      }
    }

    console.log(`Synced ${crmCheckIns.length} check-ins`)
    await this.updateCheckInStats()
  }

  private async updateCheckInStats() {
    // Update check-in statistics for all members
    const allMembers = await db.select().from(members)
    
    for (const member of allMembers) {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))
      const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90))

      const recentCheckIns = await db.select()
        .from(checkIns)
        .where(eq(checkIns.memberId, member.id))

      const checkIns30Days = recentCheckIns.filter(c => 
        c.checkInTime > thirtyDaysAgo
      ).length

      const checkIns90Days = recentCheckIns.filter(c => 
        c.checkInTime > ninetyDaysAgo
      ).length

      const avgWeekly = checkIns30Days / 4.3 // Average weeks in a month

      await db.update(members)
        .set({
          checkInCount30Days: checkIns30Days,
          checkInCount90Days: checkIns90Days,
          averageWeeklyCheckIns: avgWeekly,
          updatedAt: new Date()
        })
        .where(eq(members.id, member.id))
    }
  }

  private mapMemberStatus(crmStatus: string): 'active' | 'inactive' | 'churned' | 'paused' {
    switch (crmStatus) {
      case 'active': return 'active'
      case 'cancelled': return 'churned'
      case 'inactive': return 'inactive'
      default: return 'inactive'
    }
  }

  async runFullSync() {
    console.log('Starting full CRM sync...')
    await this.syncMembers()
    await this.syncLeads()
    await this.syncCheckIns()
    console.log('Full sync completed')
  }
}