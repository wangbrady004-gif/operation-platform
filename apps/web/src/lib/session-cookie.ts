import type { NextResponse } from 'next/server';

import { AUTH_COOKIE } from '@/lib/auth-cookies';

const SESSION_MAX_AGE_SEC = 60 * 60 * 12;

/** Options shared by set and delete so browsers reliably drop the cookie. */
export function getSessionCookieBase() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    path: '/' as const,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function attachSessionToken(res: NextResponse, token: string): void {
  const base = getSessionCookieBase();
  res.cookies.set(AUTH_COOKIE, token, base);
}

/** Clears the HttpOnly session cookie with the same flags used at login. */
export function clearSessionCookie(res: NextResponse): void {
  const { secure, sameSite, path, httpOnly } = getSessionCookieBase();
  res.cookies.set(AUTH_COOKIE, '', {
    path,
    httpOnly,
    sameSite,
    secure,
    maxAge: 0,
    expires: new Date(0),
  });
}
