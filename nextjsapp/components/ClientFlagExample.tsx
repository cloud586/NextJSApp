"use client";

import { useMemo } from "react";
import { useFlags, useLDClient } from "launchdarkly-react-client-sdk";

export default function ClientFlagExample() {
  const flags = useFlags();
  const ldClient = useLDClient();

  const showExperimentalBanner = useMemo(() => {
    if (!ldClient) {
      return undefined;
    }

    return flags["homepage.experimentalBanner"] as boolean | undefined;
  }, [flags, ldClient]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Client flag example</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        This component uses <code>useFlags()</code> from the LaunchDarkly React SDK.
      </p>
      <p className="mt-4 text-base text-zinc-800">
        <strong>homepage.experimentalBanner:</strong>{" "}
        {showExperimentalBanner ? "enabled" : "disabled"}
      </p>
    </section>
  );
}
