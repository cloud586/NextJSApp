import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LD_USER_ID_COOKIE } from "./lib/ldContext";
import {
  applyCorrelationId,
  setCorrelationResponseHeaders,
} from "./lib/logging/middlewareCorrelation";

/**
 * Ensure every visitor has a stable LaunchDarkly user key and a correlation ID
 * for request tracing across middleware, SSR, API routes, and client logs.
 */
export function middleware(request: NextRequest) {
  const { correlationId, requestHeaders } = applyCorrelationId(request);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  setCorrelationResponseHeaders(response, correlationId);

  if (!request.cookies.get(LD_USER_ID_COOKIE)) {
    response.cookies.set(LD_USER_ID_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
