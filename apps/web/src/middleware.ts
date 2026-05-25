import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth-cookies';

export function middleware(req: NextRequest) {
  if (!req.cookies.get(AUTH_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/access';
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/jobs/:path*',
    '/api/jobs/:path*',
    '/merchant-run/:path*',
    '/merchants/:path*',
    '/team',
    '/team/:path*',
    '/api/team/:path*',
  ],
};
