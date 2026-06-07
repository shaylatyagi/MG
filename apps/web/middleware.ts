// apps/web/middleware.ts — per DevSpec §10.3
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_PATHS: Record<string, string> = {
  '/owner': 'owner',
  '/admin': 'admin',
};

export function middleware(req: NextRequest) {
  // Admin uses mg_admin_token; owner uses mg_token
  const isAdmin   = req.nextUrl.pathname.startsWith('/admin');
  const token      = isAdmin
    ? req.cookies.get('mg_admin_token')?.value
    : req.cookies.get('mg_token')?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/login')) return NextResponse.next();

  if (!token)
    return NextResponse.redirect(new URL('/login', req.url));

  try {
    // Decode only — signature verified on API on every call
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString()
    );
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
      return NextResponse.redirect(new URL('/login', req.url));

    for (const [prefix, requiredRole] of Object.entries(ROLE_PATHS)) {
      if (pathname.startsWith(prefix) && payload.role !== requiredRole)
        return NextResponse.redirect(new URL('/login', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/owner/:path*', '/admin/:path*'],
};
