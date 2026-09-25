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

// PT slots per week per trainer, keyed by instructor name as returned by Trainin.
// Trainin's API doesn't expose trainer availability, so capacity is set manually.
// TODO: vul in met de werkelijke capaciteit (opgave Marvin). 0 = nog niet ingesteld.
export const PT_TRAINER_WEEKLY_CAPACITY: Record<string, number> = {
  Kelly: 0,
  Marvin: 0,
  Mireille: 0,
  Hugo: 0,
  Joanna: 0,
  Sander: 0,
}

// Subscription products left out of the monthly active subscriptions overview
export const EXCLUDED_SUBSCRIPTION_PRODUCTS = new Set([
  'Fitness onbeperkt (add-on)',
])

// Subscription products shown separately, outside the monthly total
export const SEPARATE_SUBSCRIPTION_PRODUCTS = new Set([
  'Check-up',
])
