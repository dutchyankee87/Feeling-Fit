import { Member, RiskFactor } from './google-sheets-sync'
import { STAFF_KLANT_REFS } from '@/lib/constants'

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

export interface KennismakingFunnelData {
  showUpRate: number
  totalBookings: number
  conversionRate: number
  totalClients: number
}

export interface MTInsights {
  kennismakingShowUpRate: number
  kennismakingBookings: number
  kennismakingToLidConversion: number
  kennismakingClientsTotal: number
  kennismakingRecent: KennismakingFunnelData
  kennismakingAllTime: KennismakingFunnelData
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
  ptClientCount: number
  fitnessClientCount: number
  ptRatioPercentage: number
  kennismakingByMonth: KennismakingMonthData[]
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
    // Skip staff members
    if (STAFF_KLANT_REFS.has(client.ref)) continue

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

function isPTProduct(productName: string): boolean {
  return /\bpt\b|personal training/i.test(productName)
}

function calculatePTRatio(clients: TraininClient[]): { ptCount: number; fitnessCount: number; ptRatioPercentage: number } {
  let ptClients = 0
  let fitnessClients = 0

  for (const client of clients) {
    const activeProducts = (client.clientCreditProducts || []).filter(p => p.status === 'active')
    if (activeProducts.length === 0) continue

    const hasPT = activeProducts.some(p => isPTProduct(p.name || p.creditProductName || ''))
    if (hasPT) {
      ptClients++
    } else {
      fitnessClients++
    }
  }

  const total = ptClients + fitnessClients
  return {
    ptCount: ptClients,
    fitnessCount: fitnessClients,
    ptRatioPercentage: total > 0 ? Math.round((ptClients / total) * 100) : 0
  }
}

// A single kennismaking instance: one client's one kennismaking product, with the
// exact window during which their bookings still count as "trial" bookings.
// Once the client converts (starts any non-kennismaking product), the window closes.
interface KennismakingPeriod {
  clientRef: string
  from: Date
  to: Date
  converted: boolean
}

const KENNISMAKING_WINDOW_DAYS = 28

function buildKennismakingPeriods(clients: TraininClient[]): KennismakingPeriod[] {
  const periods: KennismakingPeriod[] = []

  for (const client of clients) {
    const products = client.clientCreditProducts || []

    const otherProductStarts: Date[] = []
    for (const product of products) {
      const name = product.name || product.creditProductName || ''
      if (isKennismakingProduct(name)) continue
      const otherFrom = parseDate(product.validFrom)
      if (otherFrom) otherProductStarts.push(otherFrom)
    }
    otherProductStarts.sort((a, b) => a.getTime() - b.getTime())

    for (const product of products) {
      const name = product.name || product.creditProductName || ''
      if (!isKennismakingProduct(name)) continue

      const from = parseDate(product.validFrom) || parseDate(client.createdAt)
      if (!from) continue

      const candidates: Date[] = []
      const validUntil = parseDate(product.validUntil)
      if (validUntil) candidates.push(validUntil)

      // First non-kennismaking product that starts on/after this trial: the conversion moment.
      const conversionDate = otherProductStarts.find(d => d.getTime() >= from.getTime())
      if (conversionDate) candidates.push(conversionDate)

      candidates.push(new Date(from.getTime() + KENNISMAKING_WINDOW_DAYS * 24 * 60 * 60 * 1000))

      const to = candidates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min))

      periods.push({
        clientRef: client.ref,
        from,
        to,
        converted: !!conversionDate,
      })
    }
  }

  return periods
}

function calculateFunnelForPeriods(
  periods: KennismakingPeriod[],
  sessions: TraininSession[]
): KennismakingFunnelData {
  const totalPeriods = periods.length
  const convertedPeriods = periods.filter(p => p.converted).length

  const periodsByClient = new Map<string, KennismakingPeriod[]>()
  for (const p of periods) {
    const arr = periodsByClient.get(p.clientRef) || []
    arr.push(p)
    periodsByClient.set(p.clientRef, arr)
  }

  let totalBookings = 0
  let presentBookings = 0

  for (const session of sessions) {
    if (session.status === 'canceled' || !session.bookings) continue
    const sessionDate = parseDate(session.start)
    if (!sessionDate) continue

    for (const booking of session.bookings) {
      if (booking.status === 'canceled') continue
      const clientRef = booking.client?.ref
      if (!clientRef) continue

      const clientPeriods = periodsByClient.get(clientRef)
      if (!clientPeriods) continue

      const inPeriod = clientPeriods.some(
        p => sessionDate.getTime() >= p.from.getTime() && sessionDate.getTime() <= p.to.getTime()
      )
      if (!inPeriod) continue

      totalBookings++
      if (booking.present) presentBookings++
    }
  }

  return {
    showUpRate: totalBookings > 0 ? Math.round((presentBookings / totalBookings) * 100) : 0,
    totalBookings,
    conversionRate: totalPeriods > 0 ? Math.round((convertedPeriods / totalPeriods) * 100) : 0,
    totalClients: totalPeriods,
  }
}

function calculateKennismakingMetrics(
  periods: KennismakingPeriod[],
  sessions: TraininSession[],
  recentCutoff: Date
): { recent: KennismakingFunnelData; allTime: KennismakingFunnelData } {
  const recentPeriods = periods.filter(p => p.from.getTime() >= recentCutoff.getTime())
  return {
    recent: calculateFunnelForPeriods(recentPeriods, sessions),
    allTime: calculateFunnelForPeriods(periods, sessions),
  }
}

export interface KennismakingMonthData {
  month: string
  monthLabel: string
  totalClients: number
  totalBookings: number
  showUpRate: number
  conversionRate: number
}

function calculateKennismakingMetricsByMonth(
  periods: KennismakingPeriod[],
  sessions: TraininSession[]
): KennismakingMonthData[] {
  const monthLabels: Record<number, string> = {
    0: 'Jan', 1: 'Feb', 2: 'Mrt', 3: 'Apr', 4: 'Mei', 5: 'Jun',
    6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Okt', 10: 'Nov', 11: 'Dec'
  }

  const periodsByMonth = new Map<string, KennismakingPeriod[]>()
  for (const p of periods) {
    const key = `${p.from.getFullYear()}-${String(p.from.getMonth() + 1).padStart(2, '0')}`
    const arr = periodsByMonth.get(key) || []
    arr.push(p)
    periodsByMonth.set(key, arr)
  }

  const now = new Date()
  const results: KennismakingMonthData[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthPeriods = periodsByMonth.get(key) || []
    const funnel = calculateFunnelForPeriods(monthPeriods, sessions)

    results.push({
      month: key,
      monthLabel: `${monthLabels[d.getMonth()]} ${d.getFullYear()}`,
      totalClients: funnel.totalClients,
      totalBookings: funnel.totalBookings,
      showUpRate: funnel.showUpRate,
      conversionRate: funnel.conversionRate,
    })
  }

  return results
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
  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

  // Track total check-ins per unique date-hour and date-day combinations
  // Key: "2025-01-15-9" (date + hour) -> total check-ins that hour
  const hourTotals = new Map<string, number>()
  // Key: "2025-01-15" (date) -> total check-ins that day
  const dayTotals = new Map<string, { dayOfWeek: number; count: number }>()

  // Collect all check-ins with their timestamps
  for (const session of sessions) {
    if (session.status === 'canceled' || !session.bookings) continue

    const sessionDate = parseDate(session.start)
    if (!sessionDate) continue

    const hour = sessionDate.getHours()
    const dayOfWeek = sessionDate.getDay()
    const dateKey = sessionDate.toISOString().split('T')[0]
    const hourKey = `${dateKey}-${hour}`

    // Count present bookings in this session (excluding staff)
    let presentCount = 0
    for (const booking of session.bookings) {
      if (booking.present && booking.status !== 'canceled' && !STAFF_KLANT_REFS.has(booking.client?.ref || '')) {
        presentCount++
      }
    }

    if (presentCount > 0) {
      // Add to hour totals for this specific date-hour
      hourTotals.set(hourKey, (hourTotals.get(hourKey) || 0) + presentCount)

      // Add to day totals for this specific date
      const existingDay = dayTotals.get(dateKey)
      if (existingDay) {
        existingDay.count += presentCount
      } else {
        dayTotals.set(dateKey, { dayOfWeek, count: presentCount })
      }
    }
  }

  // Calculate average check-ins per hour across all days
  // Group hourTotals by hour (0-23), then average across dates
  const hourAggregates = new Map<number, number[]>()
  for (const [hourKey, count] of hourTotals.entries()) {
    const hour = parseInt(hourKey.split('-').pop() || '0')
    const existing = hourAggregates.get(hour) || []
    existing.push(count)
    hourAggregates.set(hour, existing)
  }

  const byHour: CheckInHourData[] = []
  for (let hour = 6; hour <= 22; hour++) {
    const counts = hourAggregates.get(hour) || []
    const avg = counts.length > 0
      ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10
      : 0
    byHour.push({ hour, avg })
  }

  // Calculate average check-ins per day of week
  // Group dayTotals by day of week, then average
  const dayAggregates = new Map<number, number[]>()
  for (const [, data] of dayTotals.entries()) {
    const existing = dayAggregates.get(data.dayOfWeek) || []
    existing.push(data.count)
    dayAggregates.set(data.dayOfWeek, existing)
  }

  const byDay: CheckInDayData[] = dayNames.map((day, index) => {
    const counts = dayAggregates.get(index) || []
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
  const thirteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 13, now.getDate())
  const ltvStartDate = '2024-01-01'

  // Fetch all required data (13 months of sessions for monthly kennismaking funnel)
  const [clients, sessions, orders, members] = await Promise.all([
    fetchFromTrainin<TraininClient>('/clients', { include: 'clientProducts' }),
    fetchFromTrainin<TraininSession>('/sessions', {
      include: 'bookings',
      from: thirteenMonthsAgo.toISOString().split('T')[0]
    }),
    fetchFromTrainin<TraininOrder>('/orders', { orderDateFrom: ltvStartDate }),
    fetchMembersFromTrainin()
  ])

  // Filter staff from client-level calculations
  const filteredClients = clients.filter(c => !STAFF_KLANT_REFS.has(c.ref))

  // Calculate all metrics
  const kennismakingPeriods = buildKennismakingPeriods(filteredClients)
  const kennismakingMetrics = calculateKennismakingMetrics(kennismakingPeriods, sessions, thirteenMonthsAgo)
  const kennismakingByMonth = calculateKennismakingMetricsByMonth(kennismakingPeriods, sessions)
  const churnByProduct = calculateChurnByProduct(filteredClients)
  const contractDuration = calculateAvgContractDuration(filteredClients)
  const ptRatio = calculatePTRatio(filteredClients)
  const slapendeMetrics = calculateSlapendeLedenMetrics(members)
  const checkInDistribution = calculateCheckInDistribution(sessions)
  const bezoekdichtheid = calculateBezoekdichtheid(members, sessions)

  // LTV calculations
  const totalLTV = members.reduce((sum, m) => sum + m.ltv, 0)
  const avgLTV = members.length > 0 ? Math.round(totalLTV / members.length) : 0

  const insights: MTInsights = {
    kennismakingShowUpRate: kennismakingMetrics.recent.showUpRate,
    kennismakingBookings: kennismakingMetrics.recent.totalBookings,
    kennismakingToLidConversion: kennismakingMetrics.recent.conversionRate,
    kennismakingClientsTotal: kennismakingMetrics.recent.totalClients,
    kennismakingRecent: kennismakingMetrics.recent,
    kennismakingAllTime: kennismakingMetrics.allTime,
    avgLTV,
    totalLTV: Math.round(totalLTV),
    churnRateByProduct: churnByProduct,
    avgContractDurationByProduct: contractDuration,
    slapendeLedenPercentage: slapendeMetrics.percentage,
    slapendeLedenCount: slapendeMetrics.count,
    checkInsByHour: checkInDistribution.byHour,
    checkInsByDay: checkInDistribution.byDay,
    bezoekdichtheid,
    totalActiveMembers: members.length,
    ptClientCount: ptRatio.ptCount,
    fitnessClientCount: ptRatio.fitnessCount,
    ptRatioPercentage: ptRatio.ptRatioPercentage,
    kennismakingByMonth,
  }

  // Update cache
  insightsCache = { data: insights, timestamp: Date.now() }
  console.log('[Trainin] MT insights calculated and cached')

  return insights
}
