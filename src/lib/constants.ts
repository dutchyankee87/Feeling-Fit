// Staff member klantRefs to exclude from all data processing
export const STAFF_KLANT_REFS = new Set([
  'CM366R8',
  'C4969QQ',
  'CA47ADK',
  'CYX6KW2',
  'CXBX8XX',
  'CA4AOL8',
  'CMKE89D',
])

// PT slots (30 min sessions) per week per trainer, keyed by instructor name as returned by Trainin.
// Trainin's API doesn't expose trainer availability, so capacity is set manually (opgave Marvin).
// Each entry applies from its `from` date until the next entry. 0 = nog niet ingesteld.
// TODO: uit Trainin halen zodra de integratie-API beschikbaarheid ontsluit (aangevraagd okt 2026).
export interface PTCapacityPeriod {
  from: string // YYYY-MM-DD
  weeklySlots: Record<string, number>
}

export const PT_TRAINER_CAPACITY_SCHEDULE: PTCapacityPeriod[] = [
  {
    from: '2026-09-30',
    weeklySlots: { Kelly: 0, Marvin: 0, Mireille: 0, Hugo: 30, Joanna: 0, Sander: 29, Aryan: 0, Sterre: 0 },
  },
  {
    from: '2026-11-01',
    weeklySlots: { Kelly: 12.5, Marvin: 16, Mireille: 25, Hugo: 30, Joanna: 0, Sander: 29, Aryan: 37.5, Sterre: 19.5 },
  },
]

// Weekly PT slots per trainer that apply on the given date (YYYY-MM-DD)
export function getWeeklyPTCapacity(dateKey: string): Record<string, number> {
  const period = [...PT_TRAINER_CAPACITY_SCHEDULE]
    .sort((a, b) => a.from.localeCompare(b.from))
    .filter(p => p.from <= dateKey)
    .pop()
  return period?.weeklySlots ?? {}
}

// Subscription products left out of the monthly active subscriptions overview
export const EXCLUDED_SUBSCRIPTION_PRODUCTS = new Set([
  'Fitness onbeperkt (add-on)',
])

// Subscription products shown separately, outside the monthly total
export const SEPARATE_SUBSCRIPTION_PRODUCTS = new Set([
  'Check-up',
])
