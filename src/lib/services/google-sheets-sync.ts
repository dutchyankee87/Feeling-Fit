const MEMBERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSyEAjR7NEHc10MkPwx3KGLv99ERMftCmaqqBqeQsmTnvQJwyVu9HE7S-pbR8Yy7fNRK1CcpSQsDVvB/pub?output=csv'
const CHECKINS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSyEAjR7NEHc10MkPwx3KGLv99ERMftCmaqqBqeQsmTnvQJwyVu9HE7S-pbR8Yy7fNRK1CcpSQsDVvB/pub?gid=1453739890&single=true&output=csv'
const PAYMENTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSyEAjR7NEHc10MkPwx3KGLv99ERMftCmaqqBqeQsmTnvQJwyVu9HE7S-pbR8Yy7fNRK1CcpSQsDVvB/pub?gid=1399037059&single=true&output=csv'

export interface RiskFactor {
  name: string
  label: string
  points: number
}

export interface Member {
  klantRef: string
  voornaam: string
  achternaam: string
  volledigeNaam: string
  email: string
  telefoon: string
  producten: string[]
  totaalTarief: number
  status: string
  actiefSinds: Date | null
  laatsteCheckIn: Date | null
  checkIns30Dagen: number
  checkIns90Dagen: number
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: RiskFactor[]
  // LTV (Lifetime Value) fields
  ltv: number // Totaal betaald sinds 1-1-2024
  aantalBetalingen: number
  laatsteBetaling: Date | null
}

interface RawMemberRow {
  'Klant voornaam': string
  'Klant achternaam': string
  'Klant ref.': string
  'Klant e-mailadres': string
  'Klant telefoonnummer': string
  'Naam van product': string
  'Tarief': string
  'Status': string
  'Actief sinds': string
}

interface RawCheckInRow {
  'first_name': string
  'last_name': string
  'start_datetime': string
}

interface CheckIn {
  voornaam: string
  achternaam: string
  datum: Date
}

interface RawPaymentRow {
  'Order ref.': string
  'Orderdatum': string
  'Klant ref.': string
  'Klant voornaam': string
  'Klant achternaam': string
  'Omschrijving': string
  'Type': string
  'Bedrag': string
  'Status': string
  'Betaald op': string
}

interface Payment {
  klantRef: string
  bedrag: number
  datum: Date
  status: string
}

function parseCSV<T>(csv: string): T[] {
  const lines = csv.split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows: T[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row as T)
  }

  return rows
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  // Handle scientific notation (e.g., "3,16E+10" or "3.16E+10")
  if (phone.includes('E+') || phone.includes('e+')) {
    const num = parseFloat(phone.replace(',', '.'))
    if (!isNaN(num)) {
      phone = Math.round(num).toString()
    }
  }

  // Remove all non-digit characters except +
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

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // Check if it's an Excel serial number (just a number)
  const numericValue = parseFloat(dateStr)
  if (!isNaN(numericValue) && numericValue > 30000 && numericValue < 50000) {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + numericValue * 24 * 60 * 60 * 1000)
    return date
  }

  // Format: "30-04-2024 21:26" or "30-04-2024"
  const parts = dateStr.split(' ')
  const dateParts = parts[0].split('-')

  if (dateParts.length !== 3) return null

  const day = parseInt(dateParts[0], 10)
  const month = parseInt(dateParts[1], 10) - 1
  const year = parseInt(dateParts[2], 10)

  // Sanity check: year should be reasonable (2000-2030)
  if (year < 2000 || year > 2030) return null

  if (parts[1]) {
    const timeParts = parts[1].split(':')
    const hour = parseInt(timeParts[0], 10)
    const minute = parseInt(timeParts[1], 10)
    return new Date(year, month, day, hour, minute)
  }

  return new Date(year, month, day)
}

// Parse ISO date format (YYYY-MM-DD)
function parseDateISO(dateStr: string): Date | null {
  if (!dateStr) return null

  // Format: "2026-01-10" or "2026-01-10 14:30:00"
  const parts = dateStr.split(' ')
  const dateParts = parts[0].split('-')

  if (dateParts.length !== 3) return null

  const year = parseInt(dateParts[0], 10)
  const month = parseInt(dateParts[1], 10) - 1
  const day = parseInt(dateParts[2], 10)

  // Sanity check
  if (year < 2000 || year > 2030) return null

  return new Date(year, month, day)
}

function calculateRiskScore(
  laatsteCheckIn: Date | null,
  checkIns30Dagen: number,
  actiefSinds: Date | null
): { score: number; level: 'low' | 'medium' | 'high' | 'critical'; factors: RiskFactor[] } {
  let score = 0
  const factors: RiskFactor[] = []

  const now = new Date()

  // Factor 1: Dagen sinds laatste check-in (main factor)
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
    // Recent (< 7 dagen) = 0 punten
  } else {
    // Geen check-ins ooit - hoogste risico
    score += 55
    factors.push({ name: 'never_visited', label: 'Nog nooit geweest', points: 55 })
  }

  // Factor 2: Check-in frequentie laatste 30 dagen (secondary factor)
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
  // 4+ check-ins in 30 dagen = 0 punten (goed!)

  // Factor 3: Nieuw lid met lage activiteit
  if (actiefSinds) {
    const daysSinceJoin = Math.floor(
      (now.getTime() - actiefSinds.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceJoin < 90 && checkIns30Dagen < 3) {
      score += 15
      factors.push({ name: 'new_member_low_activity', label: `Nieuw lid (${daysSinceJoin} dagen) met weinig activiteit`, points: 15 })
    }
  }

  // Bepaal level based on score
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

export async function fetchMembers(): Promise<Member[]> {
  // Fetch all CSVs with cache-busting timestamp
  const cacheBuster = `&_t=${Date.now()}`
  const [membersResponse, checkInsResponse, paymentsResponse] = await Promise.all([
    fetch(MEMBERS_CSV_URL + cacheBuster, { cache: 'no-store' }),
    fetch(CHECKINS_CSV_URL + cacheBuster, { cache: 'no-store' }),
    fetch(PAYMENTS_CSV_URL + cacheBuster, { cache: 'no-store' })
  ])

  const membersCSV = await membersResponse.text()
  const checkInsCSV = await checkInsResponse.text()
  const paymentsCSV = await paymentsResponse.text()

  // Parse CSVs
  const rawMembers = parseCSV<RawMemberRow>(membersCSV)
  const rawCheckIns = parseCSV<RawCheckInRow>(checkInsCSV)
  const rawPayments = parseCSV<RawPaymentRow>(paymentsCSV)

  // Parse check-ins met datum
  const checkIns: CheckIn[] = rawCheckIns
    .map(row => ({
      voornaam: row['first_name']?.toLowerCase().trim() || '',
      achternaam: row['last_name']?.toLowerCase().trim() || '',
      datum: parseDate(row['start_datetime'])
    }))
    .filter(ci => ci.datum !== null) as CheckIn[]

  // Parse betalingen - alleen betaalde/completed orders
  const payments: Payment[] = rawPayments
    .map(row => {
      // Parse bedrag (format: "81" or "74,31")
      const bedragStr = row['Bedrag']?.replace(',', '.') || '0'
      const bedrag = parseFloat(bedragStr) || 0

      // Parse datum (format: "2026-01-10" or from Betaald op)
      const datumStr = row['Betaald op'] || row['Orderdatum'] || ''
      const datum = parseDateISO(datumStr)

      return {
        klantRef: row['Klant ref.']?.trim() || '',
        bedrag,
        datum: datum!,
        status: row['Status']?.toLowerCase().trim() || ''
      }
    })
    .filter(p => p.klantRef && p.datum && (p.status === 'paid' || p.status === 'completed'))

  // Groepeer betalingen per klant
  const paymentsByKlant = new Map<string, Payment[]>()
  for (const payment of payments) {
    const existing = paymentsByKlant.get(payment.klantRef) || []
    existing.push(payment)
    paymentsByKlant.set(payment.klantRef, existing)
  }

  // Groepeer leden op Klant ref. (voor dubbele producten)
  const memberMap = new Map<string, Member>()

  for (const row of rawMembers) {
    const klantRef = row['Klant ref.']?.trim()
    if (!klantRef) continue

    const existing = memberMap.get(klantRef)
    const tarief = parseFloat(row['Tarief']?.replace(',', '.') || '0') || 0
    const product = row['Naam van product']?.trim() || ''

    if (existing) {
      // Voeg product toe aan bestaande klant
      if (product && !existing.producten.includes(product)) {
        existing.producten.push(product)
      }
      existing.totaalTarief += tarief
    } else {
      // Nieuwe klant
      const voornaam = row['Klant voornaam']?.trim() || ''
      const achternaam = row['Klant achternaam']?.trim() || ''

      memberMap.set(klantRef, {
        klantRef,
        voornaam,
        achternaam,
        volledigeNaam: `${voornaam} ${achternaam}`.trim(),
        email: row['Klant e-mailadres']?.trim() || '',
        telefoon: formatPhoneNumber(row['Klant telefoonnummer'] || ''),
        producten: product ? [product] : [],
        totaalTarief: tarief,
        status: row['Status']?.trim() || 'Onbekend',
        actiefSinds: parseDate(row['Actief sinds'] || ''),
        laatsteCheckIn: null,
        checkIns30Dagen: 0,
        checkIns90Dagen: 0,
        riskScore: 0,
        riskLevel: 'low',
        riskFactors: [],
        ltv: 0,
        aantalBetalingen: 0,
        laatsteBetaling: null
      })
    }
  }

  // Match check-ins aan leden (op naam)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  for (const member of memberMap.values()) {
    const memberFirstName = member.voornaam.toLowerCase()
    const memberLastName = member.achternaam.toLowerCase()

    // Vind alle check-ins voor deze klant
    const memberCheckIns = checkIns.filter(ci =>
      ci.voornaam === memberFirstName &&
      ci.achternaam === memberLastName
    )

    if (memberCheckIns.length > 0) {
      // Laatste check-in
      const sortedCheckIns = memberCheckIns.sort((a, b) =>
        b.datum.getTime() - a.datum.getTime()
      )
      member.laatsteCheckIn = sortedCheckIns[0].datum

      // Check-ins laatste 30 dagen
      member.checkIns30Dagen = memberCheckIns.filter(ci =>
        ci.datum >= thirtyDaysAgo
      ).length

      // Check-ins laatste 90 dagen
      member.checkIns90Dagen = memberCheckIns.filter(ci =>
        ci.datum >= ninetyDaysAgo
      ).length
    }

    // Bereken risk score
    const risk = calculateRiskScore(
      member.laatsteCheckIn,
      member.checkIns30Dagen,
      member.actiefSinds
    )
    member.riskScore = risk.score
    member.riskLevel = risk.level
    member.riskFactors = risk.factors

    // Bereken LTV (Lifetime Value) uit betalingen
    const memberPayments = paymentsByKlant.get(member.klantRef) || []
    if (memberPayments.length > 0) {
      member.ltv = memberPayments.reduce((sum, p) => sum + p.bedrag, 0)
      member.aantalBetalingen = memberPayments.length
      // Sorteer op datum (nieuwste eerst) voor laatste betaling
      const sortedPayments = memberPayments.sort((a, b) =>
        b.datum.getTime() - a.datum.getTime()
      )
      member.laatsteBetaling = sortedPayments[0].datum
    }
  }

  // Filter alleen actieve leden en sorteer op risk score
  // Case-insensitive check voor status
  const members = Array.from(memberMap.values())
    .filter(m => m.status.toLowerCase() === 'actief')
    .sort((a, b) => b.riskScore - a.riskScore)

  return members
}

export async function getStats() {
  const members = await fetchMembers()

  const totalMembers = members.length
  const atRisk = members.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length
  const criticalRisk = members.filter(m => m.riskLevel === 'critical').length
  const avgCheckIns = members.length > 0
    ? (members.reduce((sum, m) => sum + m.checkIns30Dagen, 0) / members.length / 4.3).toFixed(1)
    : '0'

  // LTV stats
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