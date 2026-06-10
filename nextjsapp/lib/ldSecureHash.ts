import { createHmac } from "crypto";

/** HMAC-SHA256 secure-mode hash for a LaunchDarkly user context key. */
export function computeSecureModeHash(userKey: string, sdkKey: string): string {
  return createHmac("sha256", sdkKey).update(userKey).digest("hex");
}
