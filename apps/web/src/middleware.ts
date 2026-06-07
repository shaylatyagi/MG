import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login page is always accessible
  if (pathname.startsWith('/login')) return NextResponse.next();

  // All /admin/* routes require admin JWT
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('mg_admin_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    try {
      // Decode only (signature verified by API on every data fetch)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString()
      );
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
