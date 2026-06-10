"use client";

import { useEffect, useState } from "react";
import { LDProvider } from "launchdarkly-react-client-sdk";
import type { LDContext, LDFlagSet } from "launchdarkly-js-client-sdk";
import { useLogging } from "@/components/LoggingProvider";
import { X_CORRELATION_ID } from "@/lib/logging/constants";

interface LDProviderWrapperProps {
  children: React.ReactNode;
  /** Context evaluated on the server — must match what the hash API returns. */
  initialContext: LDContext;
  /**
   * Flag values from server-side allFlagsState(). Seeds the browser SDK so
   * the first client render matches the server without waiting for LD.
   */
  initialBootstrap?: LDFlagSet;
  /** Server-computed secure-mode hash so LDProvider can mount on first render. */
  initialHash?: string;
}

interface SecureHashResponse {
  context: LDContext;
  hash: string;
}

/**
 * Initializes the LaunchDarkly React SDK with Secure Mode.
 *
 * Flow:
 * 1. Use server-provided hash (preferred) or fetch /api/ld-secure-hash on mount.
 * 2. Mount LDProvider immediately once hash is available.
 * 3. useReport: true uses LD's lightweight "report" connection mode.
 */
export function LDProviderWrapper({
  children,
  initialContext,
  initialBootstrap,
  initialHash,
}: LDProviderWrapperProps) {
  const { correlationId, getLogger } = useLogging();
  const [hash, setHash] = useState<string | null>(initialHash ?? null);
  const [context, setContext] = useState<LDContext>(initialContext);

  useEffect(() => {
    if (initialHash) {
      return;
    }

    const headers: HeadersInit = {};
    if (correlationId) {
      headers[X_CORRELATION_ID] = correlationId;
    }

    fetch("/api/ld-secure-hash", { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`Secure hash request failed: ${res.status}`);
        return res.json() as Promise<SecureHashResponse>;
      })
      .then(({ context: secureContext, hash: secureHash }) => {
        setContext(secureContext);
        setHash(secureHash);
      })
      .catch((err) => {
        getLogger("LDProviderWrapper").error(
          "Failed to initialize LaunchDarkly secure mode:",
          err,
        );
      });
  }, [initialHash, correlationId, getLogger]);

  const clientSideID = process.env.NEXT_PUBLIC_LD_CLIENT_SIDE_ID;
  if (!clientSideID || !hash) {
    if (!clientSideID) {
      getLogger("LDProviderWrapper").error(
        "NEXT_PUBLIC_LD_CLIENT_SIDE_ID is not set",
      );
    }
    return <>{children}</>;
  }

  return (
    <LDProvider
      clientSideID={clientSideID}
      context={context}
      reactOptions={{
        // Keep original flag keys (e.g. homepage.experimentalBanner). The SDK
        // defaults to camelCase which would break bracket lookups by LD key.
        useCamelCaseFlagKeys: false,
      }}
      options={{
        hash,
        useReport: true,
        bootstrap: initialBootstrap ?? "localStorage",
      }}
    >
      {children}
    </LDProvider>
  );
}
