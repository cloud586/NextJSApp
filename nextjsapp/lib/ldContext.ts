import { cookies } from "next/headers";
import type { LDContextCommon } from "@launchdarkly/node-server-sdk";

/** Cookie name set by middleware — holds the stable user/anonymous ID. */
export const LD_USER_ID_COOKIE = "ld_user_id";

/**
 * Build the LaunchDarkly evaluation context for the current request.
 *
 * Both the server (Node SDK) and client (React SDK) must use the same
 * context so flags evaluate consistently. The `key` field is the identity
 * LaunchDarkly uses for targeting and percentage rollouts.
 *
 * Middleware normally sets `ld_user_id` before this runs; the fallback
 * covers edge cases (e.g. API routes hit before middleware).
 */
export async function getLDContext(): Promise<LDContextCommon & { kind: "user"; key: string }> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(LD_USER_ID_COOKIE)?.value ?? "anonymous";

  return {
    kind: "user",
    key: userId,
  };
}
