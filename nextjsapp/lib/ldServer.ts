import * as LaunchDarkly from "@launchdarkly/node-server-sdk";
import type { LDClient } from "@launchdarkly/node-server-sdk";

/**
 * Singleton LaunchDarkly Node SDK client.
 *
 * Creating an LD client is expensive (network handshake, flag sync).
 * We initialize once per Node process and reuse the same instance across
 * all server components and API routes in a single request lifecycle.
 */
let clientPromise: Promise<LDClient> | null = null;

export function getServerLDClient(): Promise<LDClient> {
  if (!clientPromise) {
    const sdkKey = process.env.LD_SDK_KEY;
    if (!sdkKey) {
      throw new Error(
        "LD_SDK_KEY is not set. Add it to .env.local for server-side flag evaluation.",
      );
    }

    const client = LaunchDarkly.init(sdkKey);
    clientPromise = client.waitForInitialization({ timeout: 10 }).then(() => client);
  }

  return clientPromise;
}
