/** True when the server-side LaunchDarkly SDK key is available. */
export function isLDSdkConfigured(): boolean {
  return Boolean(process.env.LD_SDK_KEY);
}

/** True when the client-side LaunchDarkly ID was set at build time. */
export function isLDClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_LD_CLIENT_SIDE_ID);
}
