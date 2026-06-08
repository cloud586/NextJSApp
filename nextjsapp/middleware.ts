import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LD_USER_ID_COOKIE } from "./lib/ldContext";

/**
 * Ensure every visitor has a stable LaunchDarkly user key.
 *
 * Without this cookie, each page load would look like a brand-new anonymous
 * user and targeting/rollouts would not stick across sessions.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

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
