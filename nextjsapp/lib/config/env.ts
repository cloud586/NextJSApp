export interface ServerConfig {
  ldSdkKey: string | undefined;
  ldClientSideId: string | undefined;
  newRelicAppName: string;
  newRelicLicenseKey: string | undefined;
  logLevel: string;
  clientLogLevel: string;
}

/**
 * Typed accessor for server-side configuration resolved from Azure App
 * Configuration or local environment variables.
 */
export function getServerConfig(): ServerConfig {
  return {
    ldSdkKey: process.env.LD_SDK_KEY,
    ldClientSideId: process.env.LD_CLIENT_SIDE_ID,
    newRelicAppName: process.env.NEW_RELIC_APP_NAME ?? "nextjsapp",
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    logLevel: process.env.LOG_LEVEL ?? "info",
    clientLogLevel: process.env.CLIENT_LOG_LEVEL ?? "warn",
  };
}

/** True when the server-side LaunchDarkly SDK key is available. */
export function isLDSdkConfigured(): boolean {
  return Boolean(getServerConfig().ldSdkKey);
}

/** True when the LaunchDarkly client-side ID is available for SSR. */
export function isLDClientConfigured(): boolean {
  return Boolean(getServerConfig().ldClientSideId);
}

/** True when New Relic license key is configured. */
export function isNewRelicConfigured(): boolean {
  return Boolean(getServerConfig().newRelicLicenseKey);
}
