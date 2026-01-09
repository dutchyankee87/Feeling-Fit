import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'feelingfit2024'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (password === DASHBOARD_PASSWORD) {
      const cookieStore = await cookies()

      // Set auth cookie (expires in 7 days)
      cookieStore.set('dashboard_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
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
  cookieStore.delete('dashboard_auth')
  return NextResponse.json({ success: true })
}
