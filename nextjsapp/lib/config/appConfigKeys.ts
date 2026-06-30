/**
 * App Configuration key → process.env mapping.
 * Shared by azureConfig.ts (typed) and bootstrap-config.mjs (runtime entry).
 */
export const APP_CONFIG_TO_ENV = {
  "app:ld:sdk-key": "LD_SDK_KEY",
  "app:newrelic:license-key": "NEW_RELIC_LICENSE_KEY",
  "app:newrelic:app-name": "NEW_RELIC_APP_NAME",
  "app:logging:server-level": "LOG_LEVEL",
  "app:logging:client-level": "CLIENT_LOG_LEVEL",
  "app:ld:client-side-id": "LD_CLIENT_SIDE_ID",
} as const;

export type AppConfigKey = keyof typeof APP_CONFIG_TO_ENV;

export const APP_CONFIG_KEY_FILTER = "app:*";

export const CONFIG_REFRESH_INTERVAL_MS = 300_000;
