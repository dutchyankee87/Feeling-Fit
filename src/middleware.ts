import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'feelingfit2024'

export function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('dashboard_auth')

  if (authCookie?.value === 'authenticated') {
    return NextResponse.next()
  }

  // Redirect to login page
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/dashboard/:path*']
}
