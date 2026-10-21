import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  constantTimeEqual,
  createSessionToken,
} from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const dashboardPassword = process.env.DASHBOARD_PASSWORD
    if (!dashboardPassword || !process.env.AUTH_SECRET) {
      return NextResponse.json({ success: false, error: 'Auth is not configured' }, { status: 500 })
    }

    const { password } = await request.json()

    if (typeof password === 'string' && constantTimeEqual(password, dashboardPassword)) {
      const cookieStore = await cookies()

      // Set signed auth cookie (expires in 7 days)
      cookieStore.set(AUTH_COOKIE_NAME, await createSessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
  return NextResponse.json({ success: true })
}
