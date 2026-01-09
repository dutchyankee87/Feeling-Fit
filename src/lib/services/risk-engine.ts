import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { members, riskScores, checkIns, patterns } from '@/lib/db/schema'
import { eq, desc, and, gte, sql } from 'drizzle-orm'

const queryClient = postgres(process.env.DATABASE_URL!)
const db = drizzle(queryClient)

interface RiskFactor {
  name: string
  weight: number
  value: any
  impact: number
}

export class RiskEngine {
  async calculateMemberRisk(memberId: string): Promise<void> {
    const member = await db.select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1)

    if (!member[0]) return

    const factors: RiskFactor[] = []
    let totalScore = 0

    // Factor 1: Days since last check-in
    const daysSinceLastCheckIn = member[0].lastCheckIn
      ? Math.floor((Date.now() - member[0].lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
      : 999

    if (daysSinceLastCheckIn > 90) {
      factors.push({
        name: 'no_checkin_90_days',
        weight: 0.4,
        value: daysSinceLastCheckIn,
        impact: 40
      })
      totalScore += 40
    } else if (daysSinceLastCheckIn > 30) {
      factors.push({
        name: 'no_checkin_30_days',
        weight: 0.3,
        value: daysSinceLastCheckIn,
        impact: 30
      })
      totalScore += 30
    } else if (daysSinceLastCheckIn > 14) {
      factors.push({
        name: 'no_checkin_14_days',
        weight: 0.2,
        value: daysSinceLastCheckIn,
        impact: 20
      })
      totalScore += 20
    }

    // Factor 2: Declining check-in frequency
    const avgWeekly = member[0].averageWeeklyCheckIns || 0
    const recent30Days = member[0].checkInCount30Days || 0
    const expectedCheckIns = avgWeekly * 4.3

    if (avgWeekly > 0 && recent30Days < expectedCheckIns * 0.5) {
      factors.push({
        name: 'frequency_decline',
        weight: 0.25,
        value: `${recent30Days} vs ${expectedCheckIns} expected`,
        impact: 25
      })
      totalScore += 25
    }

    // Factor 3: New member risk (first 90 days)
    const daysSinceJoin = Math.floor(
      (Date.now() - member[0].joinDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceJoin < 90 && recent30Days < 4) {
      factors.push({
        name: 'new_member_low_engagement',
        weight: 0.2,
        value: `${daysSinceJoin} days old, ${recent30Days} check-ins`,
        impact: 20
      })
      totalScore += 20
    }

    // Factor 4: Consistency pattern
    if (avgWeekly > 2 && recent30Days === 0) {
      factors.push({
        name: 'sudden_stop',
        weight: 0.3,
        value: 'Was active, now stopped',
        impact: 30
      })
      totalScore += 30
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical'
    if (totalScore >= 70) level = 'critical'
    else if (totalScore >= 50) level = 'high'
    else if (totalScore >= 30) level = 'medium'
    else level = 'low'

    // Predict churn date (rough estimate)
    let predictedChurnDate = null
    if (level === 'critical') {
      predictedChurnDate = new Date()
      predictedChurnDate.setDate(predictedChurnDate.getDate() + 30)
    } else if (level === 'high') {
      predictedChurnDate = new Date()
      predictedChurnDate.setDate(predictedChurnDate.getDate() + 60)
    }

    // Save risk score
    await db.insert(riskScores)
      .values({
        memberId,
        score: totalScore,
        level,
        factors: factors as any,
        predictedChurnDate,
        confidence: this.calculateConfidence(factors),
        calculatedAt: new Date()
      })
  }

  private calculateConfidence(factors: RiskFactor[]): number {
    // More factors = higher confidence
    const factorCount = factors.length
    const maxFactors = 5
    
    // Base confidence from factor count
    let confidence = Math.min(factorCount / maxFactors, 1) * 0.7
    
    // Boost confidence if we have strong signals
    if (factors.some(f => f.name === 'no_checkin_90_days')) {
      confidence += 0.2
    }
    if (factors.some(f => f.name === 'sudden_stop')) {
      confidence += 0.1
    }
    
    return Math.min(confidence, 0.95)
  }

  async calculateAllMemberRisks(gymId: string) {
    const allMembers = await db.select()
      .from(members)
      .where(eq(members.gymId, gymId))

    console.log(`Calculating risk for ${allMembers.length} members...`)
    
    for (const member of allMembers) {
      await this.calculateMemberRisk(member.id)
    }
    
    console.log('Risk calculation completed')
  }

  async getHighRiskMembers(gymId: string, limit: number = 10) {
    const riskyMembers = await db.select({
      member: members,
      risk: riskScores
    })
    .from(members)
    .innerJoin(riskScores, eq(members.id, riskScores.memberId))
    .where(
      and(
        eq(members.gymId, gymId),
        gte(riskScores.level, 'high')
      )
    )
    .orderBy(desc(riskScores.score))
    .limit(limit)

    return riskyMembers
  }

  async detectPatterns(gymId: string) {
    // Analyze successful interventions to find patterns
    const successfulPatterns = [
      {
        name: 'Two Week Ghost',
        description: 'Member hasnt checked in for 14-21 days',
        conditions: {
          daysSinceLastCheckIn: { min: 14, max: 21 },
          previouslyActive: true
        },
        riskImpact: 0.3,
        recommendedAction: 'Send personalized WhatsApp with class recommendation'
      },
      {
        name: 'New Member Dropout',
        description: 'New member with less than 3 check-ins in first month',
        conditions: {
          daysSinceJoin: { max: 30 },
          totalCheckIns: { max: 3 }
        },
        riskImpact: 0.4,
        recommendedAction: 'Schedule onboarding call with trainer'
      },
      {
        name: 'Seasonal Churner',
        description: 'Member who typically stops in summer/winter',
        conditions: {
          historicalPattern: 'seasonal',
          currentSeason: true
        },
        riskImpact: 0.25,
        recommendedAction: 'Offer seasonal program or pause option'
      }
    ]

    for (const pattern of successfulPatterns) {
      await db.insert(patterns)
        .values({
          gymId,
          name: pattern.name,
          description: pattern.description,
          conditions: pattern.conditions as any,
          riskImpact: pattern.riskImpact,
          isActive: true,
          detectedCount: 0,
          successRate: null
        })
        .onConflictDoNothing()
    }
  }
}