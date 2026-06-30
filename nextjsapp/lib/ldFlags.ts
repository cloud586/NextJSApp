/**
 * LaunchDarkly flag keys used in this app.
 *
 * Each flag is identified by a string key that matches the key in your
 * LaunchDarkly dashboard. Centralizing keys here avoids typos and makes
 * refactors easier.
 *
 * Required environment variables (Azure App Configuration or .env.local):
 *   LD_SDK_KEY        — server-side SDK key (Node SDK + secure hash)
 *   LD_CLIENT_SIDE_ID — client-side ID (passed to browser via SSR props)
 */

/** Controls whether the experimental homepage banner is shown. */
export const HOMEPAGE_EXPERIMENTAL_BANNER = "homepage.experimentalBanner";
