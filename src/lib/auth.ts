// Dashboard session auth. Uses Web Crypto so it runs in both middleware (edge) and route handlers (node).
// Session cookie = "<expiresAtMs>.<hmacHex>", signed with AUTH_SECRET so it can't be forged.

export const AUTH_COOKIE_NAME = 'dashboard_auth'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

const encoder = new TextEncoder()

async function getSigningKey(): Promise<CryptoKey | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function sign(key: CryptoKey, message: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')
}

// Compares without short-circuiting so response time doesn't leak how many characters matched
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export async function createSessionToken(): Promise<string> {
  const key = await getSigningKey()
  if (!key) throw new Error('AUTH_SECRET is not configured')

  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  return `${expiresAt}.${await sign(key, String(expiresAt))}`
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false

  const key = await getSigningKey()
  if (!key) return false // fail closed

  const [expiresAt, signature] = token.split('.')
  if (!expiresAt || !signature || !(Number(expiresAt) > Date.now())) return false

  return constantTimeEqual(signature, await sign(key, expiresAt))
}
