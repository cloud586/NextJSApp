"use client";

import { useFlags, useLDClient } from "launchdarkly-react-client-sdk";
import { HOMEPAGE_EXPERIMENTAL_BANNER } from "@/lib/ldFlags";

/**
 * Example: client-side flag evaluation with useFlags().
 *
 * Use this in Client Components for interactive UI that should react when
 * flag values change (e.g. after a live update from LaunchDarkly). Must be
 * rendered inside LDProviderWrapper.
 */
export function ClientFlagExample() {
  const ldClient = useLDClient();
  const flags = useFlags();
  const showBanner = flags[HOMEPAGE_EXPERIMENTAL_BANNER] ?? false;
  const ldReady = Boolean(ldClient);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium text-zinc-800 dark:text-zinc-200">
        Client evaluation
      </p>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        <code className="text-xs">{HOMEPAGE_EXPERIMENTAL_BANNER}</code>{" "}
        is{" "}
        <span className="font-semibold">{showBanner ? "ON" : "OFF"}</span>
        {!ldReady && (
          <span className="ml-2 text-xs text-zinc-500">(initializing…)</span>
        )}
      </p>
      {showBanner && (
        <p className="mt-2 rounded bg-blue-100 px-2 py-1 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
          Experimental banner (rendered on client)
        </p>
      )}
    </div>
  );
}
