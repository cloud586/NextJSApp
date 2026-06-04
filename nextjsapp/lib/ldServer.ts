import { init, LDClient } from "launchdarkly-node-server-sdk";

let ldClient: LDClient | null = null;
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

// Timeout for SDK initialization (in milliseconds)
// Increase this if your network is slow or if LaunchDarkly services are experiencing latency
const INITIALIZATION_TIMEOUT_MS = 15000; // 15 seconds

function getSdkKey(): string {
  const sdkKey = process.env.LD_SDK_KEY;
  if (!sdkKey) {
    throw new Error("Missing environment variable LD_SDK_KEY");
  }
  return sdkKey;
}

export async function getServerLDClient(): Promise<LDClient> {
  if (!ldClient) {
    ldClient = init(getSdkKey(), {
      // Optional: Configure SDK behavior if needed
      logger: {
        debug: (message: string) => console.debug("[LD]", message),
        info: (message: string) => console.info("[LD]", message),
        warn: (message: string) => console.warn("[LD]", message),
        error: (message: string) => console.error("[LD]", message),
      },
    });

    // Initialize with a timeout
    initializationPromise = Promise.race([
      ldClient.waitForInitialization(),
      new Promise<void>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `LaunchDarkly SDK initialization timeout after ${INITIALIZATION_TIMEOUT_MS}ms. The SDK will continue to work with default values.`
              )
            ),
          INITIALIZATION_TIMEOUT_MS
        )
      ),
    ])
      .then(() => {
        isInitialized = true;
        console.info("LaunchDarkly SDK initialized successfully");
      })
      .catch((error) => {
        console.warn("LaunchDarkly SDK initialization warning:", error.message);
        // Don't throw; the client can still be used with default values
        isInitialized = false;
      });

    // Wait for initialization to complete (or timeout)
    await initializationPromise;
  } else if (initializationPromise) {
    // If client exists but initialization is still pending, wait for it
    await initializationPromise.catch(() => {
      // Swallow errors; client still exists
    });
  }

  return ldClient;
}

/**
 * Check if the LaunchDarkly SDK is ready.
 * Returns false if initialization timed out or failed.
 */
export function isLDClientReady(): boolean {
  return isInitialized && ldClient !== null;
}
