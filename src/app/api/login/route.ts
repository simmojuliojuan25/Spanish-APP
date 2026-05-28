import { NextRequest, NextResponse } from 'next/server'
import { checkPin, SESSION_COOKIE, SESSION_VALUE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()

  if (!checkPin(pin)) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
