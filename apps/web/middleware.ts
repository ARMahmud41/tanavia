import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side route guard (runs at the Edge).
 *
 * Reads the role cookie set by the client after login.
 * This cookie is NOT authentication — it only prevents flash-of-
 * protected-content before the client-side layout guard runs.
 * Real auth still uses the JWT in localStorage for API calls.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read role cookie (set by client after login)
  const roleCookie = request.cookies.get('tanavia_role')?.value;

  // ---- /admin/* → require ADMIN ----
  if (pathname.startsWith('/admin')) {
    // Allow the login page itself
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }
    if (roleCookie !== 'ADMIN') {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  // ---- /staff/* → require STAFF or ADMIN ----
  if (pathname.startsWith('/staff')) {
    // Allow the login page itself
    if (pathname === '/staff/login') {
      return NextResponse.next();
    }
    if (roleCookie !== 'STAFF' && roleCookie !== 'ADMIN') {
      const url = new URL('/staff/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, sitemap.xml, robots.txt
     * - static assets (images, fonts, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js|map)$).*)',
  ],
};