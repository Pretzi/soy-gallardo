import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to admin login page and auth API
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // Redirect old /login to /admin/login (backward compat)
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Allow public access to citizen report pages and public API
  if (
    pathname === '/' ||
    pathname.startsWith('/reportar') ||
    pathname === '/municipio' ||
    pathname.startsWith('/api/reportes')
  ) {
    return NextResponse.next();
  }

  // /reportes pages require auth
  if (pathname.startsWith('/reportes')) {
    const authToken = request.cookies.get('auth-token');
    if (!authToken || authToken.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // Allow public access to members pages and API (no auth required)
  if (pathname.startsWith('/members') || pathname.startsWith('/api/members')) {
    return NextResponse.next();
  }

  // Allow static assets (images, fonts, etc.) so they load on public pages like /members
  const staticExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff2', '.woff', '.ttf', '.eot'];
  if (staticExtensions.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }
  if (
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/swe-worker-') ||
    pathname.startsWith('/fallback-') ||
    pathname === '/offline' ||
    pathname === '/~offline' ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json')
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const authToken = request.cookies.get('auth-token');

  if (!authToken || authToken.value !== 'authenticated') {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (Next.js internals)
     * - Static files (images, fonts, etc.)
     * - API routes are handled by the middleware logic above
     */
    '/((?!_next|favicon.ico).*)',
  ],
};
