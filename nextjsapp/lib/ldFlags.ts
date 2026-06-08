/**
 * LaunchDarkly flag keys used in this app.
 *
 * Each flag is identified by a string key that matches the key in your
 * LaunchDarkly dashboard. Centralizing keys here avoids typos and makes
 * refactors easier.
 *
 * Required environment variables (set in .env.local, never commit secrets):
 *   LD_SDK_KEY                      — server-side SDK key (Node SDK + secure hash)
 *   NEXT_PUBLIC_LD_CLIENT_SIDE_ID   — client-side ID (safe to expose to the browser)
 */

/** Controls whether the experimental homepage banner is shown. */
export const HOMEPAGE_EXPERIMENTAL_BANNER = "homepage.experimentalBanner";
