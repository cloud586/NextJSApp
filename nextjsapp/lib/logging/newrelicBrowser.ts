/**
 * Returns the New Relic browser timing header script when the agent is configured.
 * Safe to call without NEW_RELIC_LICENSE_KEY — returns empty string.
 * Skipped during `next build` to avoid blocking on agent connection.
 */
export async function getNewRelicBrowserTimingHeader(): Promise<string> {
  if (!process.env.NEW_RELIC_LICENSE_KEY) {
    return "";
  }

  // Browser agent is runtime-only (next start / Docker), not during static build.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "";
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const newrelic = require("newrelic");

    if (newrelic.agent?.collector?.isConnected?.() === false) {
      await Promise.race([
        new Promise<void>((resolve) => {
          newrelic.agent.once("connected", resolve);
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    }

    return newrelic.getBrowserTimingHeader({
      hasToRemoveScriptWrapper: true,
      allowTransactionlessInjection: true,
    }) as string;
  } catch {
    return "";
  }
}
