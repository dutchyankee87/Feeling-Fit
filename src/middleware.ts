import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth'

// Everything requires a session except the login page and the login API itself
const PUBLIC_PATHS = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const isAuthenticated = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)

  if (isAuthenticated) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect to login page
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // Skip Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg$).*)']
}
