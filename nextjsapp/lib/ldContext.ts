import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import type { LDContext } from "launchdarkly-node-server-sdk";

export const LD_USER_CONTEXT_COOKIE = "ld-user-key";
export const LD_USER_CONTEXT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Build a shared LaunchDarkly context from cookies.
 * This helper only reads the cookie on the current request.
 * It DOES NOT set cookies - that must happen in middleware or a route handler.
 */
export async function getLDContext(): Promise<LDContext> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(LD_USER_CONTEXT_COOKIE);
  const userKey = existingCookie?.value ?? `anon-${randomUUID()}`;

  return {
    kind: "user",
    key: userKey,
  };
}

/**
 * Alias for getLDContext - no longer sets cookies (use middleware instead)
 */
export async function ensureLDContextCookie(): Promise<LDContext> {
  return getLDContext();
}
