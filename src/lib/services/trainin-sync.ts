import { Member, RiskFactor } from './google-sheets-sync'

const BASE_URL = 'https://api.trainin.app/integrations/tenant/fysiofabriek'

// ============================================
// MT Insights Types
// ============================================

export interface ProductChurnRate {
  product: string
  activeCount: number
  endedCount: number
  totalCount: number
  churnRate: number
}

export interface ProductDuration {
  product: string
  avgDays: number
  avgMonths: number
  count: number
}

export interface CheckInHourData {
  hour: number
  avg: number
}

export interface CheckInDayData {
  day: string
  avg: number
}

export interface BezoekdichtheidCategory {
  count: number
  pct: number
}

export interface BezoekdichtheidBreakdown {
  superActief: BezoekdichtheidCategory  // 3x+ per week
  actief: BezoekdichtheidCategory        // 1-2x per week
  risico: BezoekdichtheidCategory        // 1x per 2 weeks
  slapend: BezoekdichtheidCategory       // 4+ weeks geen bezoek
}

export interface MTInsights {
  kennismakingShowUpRate: number
  kennismakingBookings: number
  kennismakingToLidConversion: number
  kennismakingClientsTotal: number
  avgLTV: number
  totalLTV: number
  churnRateByProduct: ProductChurnRate[]
  avgContractDurationByProduct: ProductDuration[]
  slapendeLedenPercentage: number
  slapendeLedenCount: number
  checkInsByHour: CheckInHourData[]
  checkInsByDay: CheckInDayData[]
  bezoekdichtheid: BezoekdichtheidBreakdown
  totalActiveMembers: number
}

// In-memory cache for API responses
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let membersCache: { data: Member[]; timestamp: number } | null = null
let statsCache: { data: ReturnType<typeof calculateStats>; timestamp: number } | null = null
let insightsCache: { data: MTInsights; timestamp: number } | null = null

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS
}

function calculateStats(members: Member[]) {
  const totalMembers = members.length
  const atRisk = members.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length
  const criticalRisk = members.filter(m => m.riskLevel === 'critical').length
  const avgCheckIns = members.length > 0
    ? (members.reduce((sum, m) => sum + m.checkIns30Dagen, 0) / members.length / 4.3).toFixed(1)
    : '0'

  const totalLTV = members.reduce((sum, m) => sum + m.ltv, 0)
  const avgLTV = members.length > 0 ? totalLTV / members.length : 0
  const membersWithPayments = members.filter(m => m.ltv > 0).length

  return {
    totalMembers,
    atRisk,
    criticalRisk,
    avgCheckIns: parseFloat(avgCheckIns),
    totalLTV: Math.round(totalLTV),
    avgLTV: Math.round(avgLTV),
    membersWithPayments
  }
}

// Trainin API Types (based on actual API responses)
interface TraininClient {
  ref: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  lastVisit?: string // Direct field from API: "2024-11-20 16:35:55"
  createdAt?: string
  clientCreditProducts?: TraininClientProduct[]
}

interface TraininClientProduct {
  ref: string
  name: string
  status: string // 'active', 'expired', etc.
  type: string // 'subscription', 'single'
  validFrom?: string
  validUntil?: string
  price: number
  creditProductName?: string
}

interface TraininSession {
  ref: string
  start: string // "2025-01-01 14:00:00"
  status: string
  bookings?: TraininBooking[]
}

interface TraininBooking {
  ref: string
  status: string // 'reserved', 'canceled', etc.
  present: boolean
  client: {
    ref: string
    name: string
  }
}

interface TraininOrder {
  ref: string
  orderDate: string
  status: string // 'paid', 'planned', etc.
  clientRef: string
  amountInVat: number
}

interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// Fetch helper with auth and pagination
async function fetchFromTrainin<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const token = process.env.TRAININ_API_TOKEN
  if (!token) {
    throw new Error('TRAININ_API_TOKEN is not configured')
  }

  const allResults: T[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const searchParams = new URLSearchParams({
      ...params,
      page: page.toString(),
      perPage: '1000'
    })

    const url = `${BASE_URL}${endpoint}?${searchParams}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Trainin API error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json() as PaginatedResponse<T>

    // Handle both array response and paginated response
    const data = Array.isArray(json) ? json : (json.data || [])
    allResults.push(...data)

    // Check pagination
    if (Array.isArray(json)) {
      hasMore = false
    } else if (json.last_page) {
      hasMore = page < json.last_page
      page++
    } else {
      hasMore = false
    }
  }

  return allResults
}

function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return ''

  let cleaned = phone.replace(/[^\d+]/g, '')

  // If it starts with 31 (Netherlands) but no +, add +
  if (cleaned.startsWith('31') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }

  // If it's a Dutch number without country code (starts with 06)
  if (cleaned.startsWith('06') || cleaned.startsWith('6')) {
    if (cleaned.startsWith('6') && cleaned.length === 9) {
      cleaned = '+31' + cleaned
    } else if (cleaned.startsWith('06')) {
      cleaned = '+31' + cleaned.substring(1)
    }
  }

  // If just digits and 9-10 long, assume Dutch mobile
  if (/^\d{9,10}$/.test(cleaned)) {
    cleaned = '+31' + cleaned
  }

  return cleaned
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

function calculateRiskScore(
  laatsteCheckIn: Date | null,
  checkIns30Dagen: number,
  actiefSinds: Date | null
): { score: number; level: 'low' | 'medium' | 'high' | 'critical'; factors: RiskFactor[] } {
  let score = 0
  const factors: RiskFactor[] = []
  const now = new Date()

  // Factor 1: Days since last check-in
  if (laatsteCheckIn) {
    const daysSinceLastCheckIn = Math.floor(
      (now.getTime() - laatsteCheckIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastCheckIn > 180) {
      score += 50
      factors.push({ name: 'no_checkin_180', label: `${daysSinceLastCheckIn} dagen niet geweest`, points: 50 })
    } else if (daysSinceLastCheckIn > 90) {
      score += 40
      factors.push({ name: 'no_checkin_90', label: `${daysSinceLastCheckIn} dagen niet geweest`, points: 40 })
    } else if (daysSinceLastCheckIn > 60) {
      score += 35
      factors.push({ name: 'no_checkin_60', label: `${daysSinceLastCheckIn} dagen niet geweest`, points: 35 })
    } else if (daysSinceLastCheckIn > 30) {
      score += 25
      factors.push({ name: 'no_checkin_30', label: `${daysSinceLastCheckIn} dagen niet geweest`, points: 25 })
    } else if (daysSinceLastCheckIn > 14) {
      score += 15
      factors.push({ name: 'no_checkin_14', label: `${daysSinceLastCheckIn} dagen niet geweest`, points: 15 })
    } else if (daysSinceLastCheckIn > 7) {
      score += 8
      factors.push({ name: 'no_checkin_7', label: `${daysSinceLastCheckIn} dagen niet geweest`, points: 8 })
    }
  } else {
    score += 55
    factors.push({ name: 'never_visited', label: 'Nog nooit geweest', points: 55 })
  }

  // Factor 2: Check-in frequency last 30 days
  if (checkIns30Dagen === 0) {
    score += 20
    factors.push({ name: 'zero_checkins_30d', label: '0 check-ins afgelopen 30 dagen', points: 20 })
  } else if (checkIns30Dagen < 2) {
    score += 12
    factors.push({ name: 'low_checkins_30d', label: `Slechts ${checkIns30Dagen} check-in afgelopen 30 dagen`, points: 12 })
  } else if (checkIns30Dagen < 4) {
    score += 5
    factors.push({ name: 'medium_checkins_30d', label: `${checkIns30Dagen} check-ins afgelopen 30 dagen`, points: 5 })
  }

  // Factor 3: New member with low activity
  if (actiefSinds) {
    const daysSinceJoin = Math.floor(
      (now.getTime() - actiefSinds.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceJoin < 90 && checkIns30Dagen < 3) {
      score += 15
      factors.push({ name: 'new_member_low_activity', label: `Nieuw lid (${daysSinceJoin} dagen) met weinig activiteit`, points: 15 })
    }
  }

  let level: 'low' | 'medium' | 'high' | 'critical'
  if (score >= 55) {
    level = 'critical'
  } else if (score >= 40) {
    level = 'high'
  } else if (score >= 20) {
    level = 'medium'
  } else {
    level = 'low'
  }

  return { score: Math.min(score, 100), level, factors }
}

async function fetchMembersFromTraininInternal(): Promise<Member[]> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ltvStartDate = '2024-01-01'

  // Fetch all data in parallel
  // Note: include=clientProducts returns data in clientCreditProducts field
  const [clients, sessions, orders] = await Promise.all([
    fetchFromTrainin<TraininClient>('/clients', { include: 'clientProducts' }),
    fetchFromTrainin<TraininSession>('/sessions', {
      include: 'bookings',
      from: ninetyDaysAgo.toISOString().split('T')[0]
    }),
    fetchFromTrainin<TraininOrder>('/orders', { orderDateFrom: ltvStartDate })
  ])

  // Build check-in map by client ref (only sessions where client was present)
  const checkInsByClient = new Map<string, Date[]>()
  for (const session of sessions) {
    if (session.status === 'canceled') continue
    const sessionDate = parseDate(session.start)
    if (!sessionDate || !session.bookings) continue

    for (const booking of session.bookings) {
      // Only count if present (actually attended)
      if (!booking.present || booking.status === 'canceled') continue

      const clientRef = booking.client?.ref
      if (!clientRef) continue

      const existing = checkInsByClient.get(clientRef) || []
      existing.push(sessionDate)
      checkInsByClient.set(clientRef, existing)
    }
  }

  // Build payment map by client ref
  const paymentsByClient = new Map<string, { total: number; count: number; lastDate: Date | null }>()
  for (const order of orders) {
    if (order.status !== 'paid') continue

    const orderDate = parseDate(order.orderDate)
    const existing = paymentsByClient.get(order.clientRef) || { total: 0, count: 0, lastDate: null }
    existing.total += order.amountInVat || 0
    existing.count++
    if (orderDate && (!existing.lastDate || orderDate > existing.lastDate)) {
      existing.lastDate = orderDate
    }
    paymentsByClient.set(order.clientRef, existing)
  }

  // Transform clients to Members
  const members: Member[] = []

  for (const client of clients) {
    // Get active products from clientCreditProducts
    const activeProducts = (client.clientCreditProducts || []).filter(p =>
      p.status === 'active'
    )

    // Skip clients with no active products (not active members)
    if (activeProducts.length === 0) continue

    // Get earliest start date from products
    const startDates = activeProducts
      .map(p => parseDate(p.validFrom))
      .filter((d): d is Date => d !== null)
    const actiefSinds = startDates.length > 0
      ? new Date(Math.min(...startDates.map(d => d.getTime())))
      : parseDate(client.createdAt)

    // Use lastVisit from client if available (more accurate than calculating from sessions)
    const laatsteCheckInFromApi = parseDate(client.lastVisit)

    // Get check-in stats from sessions (for 30/90 day counts)
    const clientCheckIns = checkInsByClient.get(client.ref) || []
    const checkIns30Dagen = clientCheckIns.filter(d => d >= thirtyDaysAgo).length
    const checkIns90Dagen = clientCheckIns.filter(d => d >= ninetyDaysAgo).length

    // Use API lastVisit, or fallback to calculated last check-in
    const sortedCheckIns = clientCheckIns.sort((a, b) => b.getTime() - a.getTime())
    const laatsteCheckIn = laatsteCheckInFromApi || sortedCheckIns[0] || null

    // Calculate risk score
    const risk = calculateRiskScore(laatsteCheckIn, checkIns30Dagen, actiefSinds)

    // Get payment stats
    const payments = paymentsByClient.get(client.ref) || { total: 0, count: 0, lastDate: null }

    // Calculate total tariff from active products
    const totaalTarief = activeProducts.reduce((sum, p) => sum + (p.price || 0), 0)

    members.push({
      klantRef: client.ref,
      voornaam: client.firstName || '',
      achternaam: client.lastName || '',
      volledigeNaam: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      email: client.email || '',
      telefoon: formatPhoneNumber(client.phone),
      producten: activeProducts.map(p => p.name || p.creditProductName || 'Unknown'),
      totaalTarief,
      status: 'Actief',
      actiefSinds,
      laatsteCheckIn,
      checkIns30Dagen,
      checkIns90Dagen,
      riskScore: risk.score,
      riskLevel: risk.level,
      riskFactors: risk.factors,
      ltv: payments.total,
      aantalBetalingen: payments.count,
      laatsteBetaling: payments.lastDate
    })
  }

  // Sort by risk score (highest first)
  return members.sort((a, b) => b.riskScore - a.riskScore)
}

// Cached export function
export async function fetchMembersFromTrainin(): Promise<Member[]> {
  // Return cached data if valid
  if (membersCache && isCacheValid(membersCache.timestamp)) {
    console.log('[Trainin] Returning cached members data')
    return membersCache.data
  }

  console.log('[Trainin] Fetching fresh data from API...')
  const members = await fetchMembersFromTraininInternal()

  // Update cache
  membersCache = { data: members, timestamp: Date.now() }
  // Also update stats cache since we have fresh data
  statsCache = { data: calculateStats(members), timestamp: Date.now() }

  console.log(`[Trainin] Cached ${members.length} members`)
  return members
}

export async function getStatsFromTrainin() {
  // Return cached stats if valid
  if (statsCache && isCacheValid(statsCache.timestamp)) {
    console.log('[Trainin] Returning cached stats')
    return statsCache.data
  }

  // Fetching members will also populate stats cache
  const members = await fetchMembersFromTrainin()
  return calculateStats(members)
}

// ============================================
// MT Insights Calculation Functions
// ============================================

function isKennismakingProduct(productName: string): boolean {
  const name = productName.toLowerCase()
  return name.includes('kennismaking') || name.includes('proef')
}

function calculateKennismakingMetrics(
  clients: TraininClient[],
  sessions: TraininSession[]
): { showUpRate: number; totalBookings: number; conversionRate: number; totalClients: number } {
  // Find all clients who have/had a kennismaking product
  const kennismakingClients = new Set<string>()
  const clientsWithOtherProducts = new Set<string>()

  for (const client of clients) {
    const products = client.clientCreditProducts || []
    let hasKennismaking = false
    let hasOtherProduct = false

    for (const product of products) {
      if (isKennismakingProduct(product.name || product.creditProductName || '')) {
        hasKennismaking = true
      } else {
        hasOtherProduct = true
      }
    }

    if (hasKennismaking) {
      kennismakingClients.add(client.ref)
      if (hasOtherProduct) {
        clientsWithOtherProducts.add(client.ref)
      }
    }
  }

  // Calculate show-up rate from session bookings for kennismaking clients
  let totalBookings = 0
  let presentBookings = 0

  for (const session of sessions) {
    if (session.status === 'canceled' || !session.bookings) continue

    for (const booking of session.bookings) {
      if (booking.status === 'canceled') continue
      const clientRef = booking.client?.ref
      if (!clientRef || !kennismakingClients.has(clientRef)) continue

      totalBookings++
      if (booking.present) {
        presentBookings++
      }
    }
  }

  const totalKennismakingClients = kennismakingClients.size
  const convertedClients = clientsWithOtherProducts.size

  return {
    showUpRate: totalBookings > 0 ? Math.round((presentBookings / totalBookings) * 100) : 0,
    totalBookings,
    conversionRate: totalKennismakingClients > 0
      ? Math.round((convertedClients / totalKennismakingClients) * 100)
      : 0,
    totalClients: totalKennismakingClients
  }
}

function calculateChurnByProduct(clients: TraininClient[]): ProductChurnRate[] {
  const productStats = new Map<string, { active: number; ended: number }>()

  for (const client of clients) {
    const products = client.clientCreditProducts || []

    for (const product of products) {
      const name = product.name || product.creditProductName || 'Onbekend'
      // Skip kennismaking products from churn calculation
      if (isKennismakingProduct(name)) continue

      const existing = productStats.get(name) || { active: 0, ended: 0 }

      if (product.status === 'active') {
        existing.active++
      } else if (product.status === 'expired' || product.status === 'cancelled' || product.status === 'canceled') {
        existing.ended++
      }

      productStats.set(name, existing)
    }
  }

  // Convert to array and calculate churn rate
  const results: ProductChurnRate[] = []
  for (const [product, stats] of productStats.entries()) {
    const total = stats.active + stats.ended
    if (total < 5) continue // Skip products with very few instances

    results.push({
      product,
      activeCount: stats.active,
      endedCount: stats.ended,
      totalCount: total,
      churnRate: Math.round((stats.ended / total) * 100)
    })
  }

  return results.sort((a, b) => b.totalCount - a.totalCount)
}

function calculateAvgContractDuration(clients: TraininClient[]): ProductDuration[] {
  const productDurations = new Map<string, number[]>()

  for (const client of clients) {
    const products = client.clientCreditProducts || []

    for (const product of products) {
      const name = product.name || product.creditProductName || 'Onbekend'
      if (isKennismakingProduct(name)) continue

      const validFrom = parseDate(product.validFrom)
      const validUntil = parseDate(product.validUntil)

      if (validFrom && validUntil) {
        const durationDays = Math.floor(
          (validUntil.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (durationDays > 0 && durationDays < 3650) { // Max 10 years
          const existing = productDurations.get(name) || []
          existing.push(durationDays)
          productDurations.set(name, existing)
        }
      }
    }
  }

  const results: ProductDuration[] = []
  for (const [product, durations] of productDurations.entries()) {
    if (durations.length < 3) continue // Skip products with few data points

    const avgDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    results.push({
      product,
      avgDays,
      avgMonths: Math.round((avgDays / 30.44) * 10) / 10,
      count: durations.length
    })
  }

  return results.sort((a, b) => b.count - a.count)
}

function calculateSlapendeLedenMetrics(members: Member[]): { percentage: number; count: number } {
  const SLAPEND_THRESHOLD_DAYS = 28 // 4 weeks

  const slapendeCount = members.filter(m => {
    if (!m.laatsteCheckIn) return true // Never visited = slapend
    const daysSince = Math.floor(
      (Date.now() - m.laatsteCheckIn.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSince >= SLAPEND_THRESHOLD_DAYS
  }).length

  return {
    count: slapendeCount,
    percentage: members.length > 0 ? Math.round((slapendeCount / members.length) * 100) : 0
  }
}

function calculateCheckInDistribution(
  sessions: TraininSession[]
): { byHour: CheckInHourData[]; byDay: CheckInDayData[] } {
  const hourCounts = new Map<number, number[]>() // hour -> counts per day
  const dayCounts = new Map<string, number[]>() // day name -> counts per week

  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
  const dateCheckIns = new Map<string, { hour: number; dayOfWeek: number }>()

  // Collect all check-ins with their timestamps
  for (const session of sessions) {
    if (session.status === 'canceled' || !session.bookings) continue

    const sessionDate = parseDate(session.start)
    if (!sessionDate) continue

    const hour = sessionDate.getHours()
    const dayOfWeek = sessionDate.getDay()

    // Count present bookings
    let presentCount = 0
    for (const booking of session.bookings) {
      if (booking.present && booking.status !== 'canceled') {
        presentCount++
      }
    }

    if (presentCount > 0) {
      const dateKey = sessionDate.toISOString().split('T')[0]
      const hourKey = `${dateKey}-${hour}`

      // Aggregate by hour
      const existingHour = hourCounts.get(hour) || []
      existingHour.push(presentCount)
      hourCounts.set(hour, existingHour)

      // Aggregate by day of week
      const dayName = dayNames[dayOfWeek]
      const existingDay = dayCounts.get(dayName) || []
      existingDay.push(presentCount)
      dayCounts.set(dayName, existingDay)
    }
  }

  // Calculate averages per hour (6:00 - 22:00)
  const byHour: CheckInHourData[] = []
  for (let hour = 6; hour <= 22; hour++) {
    const counts = hourCounts.get(hour) || []
    const avg = counts.length > 0
      ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10
      : 0
    byHour.push({ hour, avg })
  }

  // Calculate averages per day
  const byDay: CheckInDayData[] = dayNames.map(day => {
    const counts = dayCounts.get(day) || []
    const avg = counts.length > 0
      ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10
      : 0
    return { day, avg }
  })

  // Reorder to start with Monday
  const mondayFirst = [...byDay.slice(1), byDay[0]]

  return { byHour, byDay: mondayFirst }
}

function calculateBezoekdichtheid(
  members: Member[],
  sessions: TraininSession[]
): BezoekdichtheidBreakdown {
  const now = new Date()
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000)

  // Count 12-week check-ins per member
  const memberCheckIns = new Map<string, number>()

  for (const session of sessions) {
    if (session.status === 'canceled' || !session.bookings) continue

    const sessionDate = parseDate(session.start)
    if (!sessionDate || sessionDate < twelveWeeksAgo) continue

    for (const booking of session.bookings) {
      if (!booking.present || booking.status === 'canceled') continue
      const clientRef = booking.client?.ref
      if (!clientRef) continue

      const current = memberCheckIns.get(clientRef) || 0
      memberCheckIns.set(clientRef, current + 1)
    }
  }

  // Categorize members
  let superActief = 0
  let actief = 0
  let risico = 0
  let slapend = 0

  for (const member of members) {
    const checkIns = memberCheckIns.get(member.klantRef) || 0
    const avgPerWeek = checkIns / 12

    // Check if slapend (4+ weeks no visit)
    if (!member.laatsteCheckIn || member.laatsteCheckIn < fourWeeksAgo) {
      slapend++
    } else if (avgPerWeek >= 3) {
      superActief++
    } else if (avgPerWeek >= 1) {
      actief++
    } else if (avgPerWeek >= 0.5) {
      risico++
    } else {
      slapend++
    }
  }

  const total = members.length

  return {
    superActief: { count: superActief, pct: total > 0 ? Math.round((superActief / total) * 100) : 0 },
    actief: { count: actief, pct: total > 0 ? Math.round((actief / total) * 100) : 0 },
    risico: { count: risico, pct: total > 0 ? Math.round((risico / total) * 100) : 0 },
    slapend: { count: slapend, pct: total > 0 ? Math.round((slapend / total) * 100) : 0 }
  }
}

// Main MT Insights function with caching
export async function getMTInsights(): Promise<MTInsights> {
  // Return cached data if valid
  if (insightsCache && isCacheValid(insightsCache.timestamp)) {
    console.log('[Trainin] Returning cached MT insights')
    return insightsCache.data
  }

  console.log('[Trainin] Calculating MT insights...')

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const ltvStartDate = '2024-01-01'

  // Fetch all required data
  const [clients, sessions, orders, members] = await Promise.all([
    fetchFromTrainin<TraininClient>('/clients', { include: 'clientProducts' }),
    fetchFromTrainin<TraininSession>('/sessions', {
      include: 'bookings',
      from: ninetyDaysAgo.toISOString().split('T')[0]
    }),
    fetchFromTrainin<TraininOrder>('/orders', { orderDateFrom: ltvStartDate }),
    fetchMembersFromTrainin()
  ])

  // Calculate all metrics
  const kennismakingMetrics = calculateKennismakingMetrics(clients, sessions)
  const churnByProduct = calculateChurnByProduct(clients)
  const contractDuration = calculateAvgContractDuration(clients)
  const slapendeMetrics = calculateSlapendeLedenMetrics(members)
  const checkInDistribution = calculateCheckInDistribution(sessions)
  const bezoekdichtheid = calculateBezoekdichtheid(members, sessions)

  // LTV calculations
  const totalLTV = members.reduce((sum, m) => sum + m.ltv, 0)
  const avgLTV = members.length > 0 ? Math.round(totalLTV / members.length) : 0

  const insights: MTInsights = {
    kennismakingShowUpRate: kennismakingMetrics.showUpRate,
    kennismakingBookings: kennismakingMetrics.totalBookings,
    kennismakingToLidConversion: kennismakingMetrics.conversionRate,
    kennismakingClientsTotal: kennismakingMetrics.totalClients,
    avgLTV,
    totalLTV: Math.round(totalLTV),
    churnRateByProduct: churnByProduct,
    avgContractDurationByProduct: contractDuration,
    slapendeLedenPercentage: slapendeMetrics.percentage,
    slapendeLedenCount: slapendeMetrics.count,
    checkInsByHour: checkInDistribution.byHour,
    checkInsByDay: checkInDistribution.byDay,
    bezoekdichtheid,
    totalActiveMembers: members.length
  }

  // Update cache
  insightsCache = { data: insights, timestamp: Date.now() }
  console.log('[Trainin] MT insights calculated and cached')

  return insights
}
