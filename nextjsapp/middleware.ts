import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LD_USER_CONTEXT_COOKIE, LD_USER_CONTEXT_COOKIE_MAX_AGE_SECONDS } from '@/lib/ldContext';

function generateSimpleUUID(): string {
  // Simple UUID v4 implementation that works in edge runtime
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if the LD user context cookie exists
  const existingCookie = request.cookies.get(LD_USER_CONTEXT_COOKIE);
  
  if (!existingCookie) {
    // Generate a new user key if one doesn't exist
    const userKey = `anon-${generateSimpleUUID()}`;
    
    // Set the cookie in the response
    response.cookies.set({
      name: LD_USER_CONTEXT_COOKIE,
      value: userKey,
      httpOnly: true,
      path: '/',
      maxAge: LD_USER_CONTEXT_COOKIE_MAX_AGE_SECONDS,
      sameSite: 'lax',
    });
  }

  return response;
}

// Run middleware on all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

