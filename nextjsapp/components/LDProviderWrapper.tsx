"use client";

import { useEffect, useMemo, useState } from "react";
import { LDProvider, useLDClient } from "launchdarkly-react-client-sdk";
import type { LDContext, LDFlagSet } from "launchdarkly-js-client-sdk";

const clientSideID = process.env.NEXT_PUBLIC_LD_CLIENT_SIDE_ID ?? "";

if (!clientSideID) {
  throw new Error(
    "Missing NEXT_PUBLIC_LD_CLIENT_SIDE_ID. Set this environment variable to your LaunchDarkly client-side ID."
  );
}

type LDProviderWrapperProps = {
  children: React.ReactNode;
  initialContext: LDContext;
  initialBootstrap?: LDFlagSet;
  initialSecurePayload?: { context?: LDContext; hash?: string };
};

export default function LDProviderWrapper({
  children,
  initialContext,
  initialBootstrap,
  initialSecurePayload,
}: LDProviderWrapperProps) {
  const [securePayload, setSecurePayload] = useState<{
    context?: LDContext;
    hash?: string;
  } | undefined>(() => {
    // defensively access potential server-provided payload to avoid runtime
    // ReferenceError if the identifier is not present in some runtimes.
    try {
      if (typeof initialSecurePayload !== "undefined" && initialSecurePayload) {
        console.info("[LD-debug] Initial secure payload from server:", JSON.stringify(initialSecurePayload));
        return initialSecurePayload as { context?: LDContext; hash?: string };
      }
    } catch (e) {
      // ignore
    }
    try {
      if (typeof window !== "undefined" && (window as any).__ld_secure_payload) {
        console.info("[LD-debug] Secure payload from window:", JSON.stringify((window as any).__ld_secure_payload));
        return (window as any).__ld_secure_payload as { context?: LDContext; hash?: string };
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  });

  useEffect(() => {
    async function fetchSecureHash() {
      try {
        const response = await fetch("/api/ld-secure-hash");
        if (!response.ok) {
          console.error(
            `Failed to load LaunchDarkly secure hash: ${response.status} ${response.statusText}`
          );
          const errorBody = await response.text();
          console.error("Error body:", errorBody);
          setSecurePayload({ context: initialContext });
          return;
        }

        const payload = await response.json();
        console.info("[LD-debug] Secure hash loaded successfully");
        console.info("[LD-debug] Context from API:", JSON.stringify(payload.context));
        console.info("[LD-debug] Hash from API:", payload.hash);
        setSecurePayload({
          context: payload.context,
          hash: payload.hash,
        });
      } catch (error) {
        console.error("Failed to load LaunchDarkly secure hash:", error);
        setSecurePayload({ context: initialContext });
      }
    }
    // Only fetch client-side if there wasn't a server-provided payload
    if (!securePayload) fetchSecureHash();
  }, [initialContext]);

  const bootstrapValue =
    initialBootstrap && Object.keys(initialBootstrap).length > 0
      ? initialBootstrap
      : ("localStorage" as const);

  const options = useMemo(
    () => ({
      hash: securePayload?.hash,
      useReport: false,
      bootstrap: bootstrapValue,
    }),
    [securePayload?.hash, bootstrapValue]
  );

  // Instrument client-side network for debugging LaunchDarkly requests.
  // Logs the `securePayload`, `clientSideID`, and `options`, and wraps
  // `fetch` to print request/response pairs for LD endpoints.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // keep references to originals so we can restore them on cleanup
    let _origFetch: any = null;
    let _origXHROpen: any = null;
    let _origXHRSend: any = null;
    let _origEventSource: any = null;

    try {
      console.info("[LD-debug] clientSideID:", clientSideID);
      console.info("[LD-debug] securePayload:", securePayload);
      console.info("[LD-debug] options:", options);

      _origFetch = (window as any).fetch;
      const origFetch = _origFetch.bind(window);
      // Avoid double-wrapping
      if (!(origFetch as any).__ld_debug_wrapped) {
        const normalizeHeaders = (h?: RequestInit['headers']) => {
          const out: Record<string, string> = {};
          if (!h) return out;
          try {
            if (h instanceof Headers) {
              h.forEach((v, k) => (out[k] = v));
            } else if (Array.isArray(h)) {
              h.forEach(([k, v]) => (out[k] = String(v)));
            } else {
              Object.entries(h as Record<string, any>).forEach(([k, v]) => (out[k] = String(v)));
            }
          } catch (e) {
            // fallback: ignore
          }
          return out;
        };

        const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          const shouldLog = url.includes("launchdarkly") || url.includes("/sdk/evalx/");
          const shouldProxy = url.includes("launchdarkly") || url.includes("/sdk/evalx/");
          if (shouldLog) {
            console.info("[LD-debug] FETCH ->", url, init?.method ?? "GET", init?.headers ?? {});
          }
          // Route LaunchDarkly calls through a local proxy so we can capture
          // the full request/response server-side (temporary).
          if (shouldProxy) {
            try {
              const proxyBase = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:3001/ld-proxy'
                : '/api/ld-proxy';
              const headersObj = normalizeHeaders(init?.headers);
              const proxyResp = await origFetch(proxyBase, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ url, method: init?.method ?? "GET", headers: headersObj, body: init?.body ?? null }),
              });
              const text = await proxyResp.text();
              if (shouldLog) console.info("[LD-debug] PROXY <-", url, "status:", proxyResp.status, "body:", text);
              return new Response(text, { status: proxyResp.status, headers: proxyResp.headers as any });
            } catch (e) {
              console.warn("[LD-debug] proxy fetch failed", e);
            }
          }

          const res = await origFetch(input, init);
          if (shouldLog) {
            try {
              const clone = res.clone();
              const text = await clone.text();
              console.info("[LD-debug] FETCH <-", url, "status:", res.status, "body:", text);
            } catch (e) {
              console.warn("[LD-debug] failed to read LD response body", e);
            }
          }
          return res;
        };
        (wrapped as any).__ld_debug_wrapped = true;
        (window as any).fetch = wrapped;
      }

      // Wrap XMLHttpRequest to capture non-fetch LD requests
      try {
        const XHR = (window as any).XMLHttpRequest;
        if (XHR && !XHR.__ld_debug_wrapped_xhr) {
          const origOpen = XHR.prototype.open;
          const origSend = XHR.prototype.send;
          _origXHROpen = origOpen;
          _origXHRSend = origSend;

          XHR.prototype.open = function (method: string, url?: string | URL) {
            try {
              (this as any).__ld_debug_url = typeof url === 'string' ? url : url?.toString?.();
              (this as any).__ld_debug_method = method;
            } catch (e) {
              // ignore
            }
            return origOpen.apply(this, arguments as any);
          };

          XHR.prototype.send = function (body?: any) {
            const url = (this as any).__ld_debug_url as string | undefined;
            const method = (this as any).__ld_debug_method as string | undefined;
            const shouldLog = url && (url.includes('launchdarkly') || url.includes('/sdk/evalx/'));
            if (shouldLog) {
              console.info('[LD-debug] XHR ->', url, method ?? 'SEND', body ?? null);
            }

            const onLoad = function (this: XMLHttpRequest) {
              try {
                if (shouldLog) {
                  console.info('[LD-debug] XHR <-', url, 'status:', this.status, 'body:', this.responseText);
                }
              } catch (e) {
                console.warn('[LD-debug] failed to read XHR response', e);
              }
            };
            this.addEventListener('load', onLoad);

            // cleanup listener when the XHR is finished to avoid leaks
            this.addEventListener('readystatechange', function (this: XMLHttpRequest) {
              if (this.readyState === 4) {
                try {
                  this.removeEventListener('load', onLoad);
                } catch (e) {
                  /* ignore */
                }
              }
            });

            return origSend.apply(this, arguments as any);
          };

          XHR.__ld_debug_wrapped_xhr = true;
        }
      } catch (e) {
        console.warn('[LD-debug] failed to wrap XHR', e);
      }

      // Wrap EventSource to log server-sent events to LD endpoints (if used)
      try {
        const OrigEventSource = (window as any).EventSource;
        _origEventSource = OrigEventSource;
        if (OrigEventSource && !(OrigEventSource as any).__ld_debug_wrapped_es) {
          const WrappedEventSource = function (url: string, config?: any) {
            const es = new OrigEventSource(url, config);
            try {
              const shouldLog = url && (url.includes('launchdarkly') || url.includes('/sdk/evalx/'));
              if (shouldLog) {
                console.info('[LD-debug] EventSource ->', url);
                es.addEventListener('message', (ev: any) => {
                  console.info('[LD-debug] EventSource msg <-', url, ev.data);
                });
                es.addEventListener('error', (ev: any) => {
                  console.info('[LD-debug] EventSource err <-', url, ev);
                });
              }
            } catch (e) {
              console.warn('[LD-debug] EventSource wrapper error', e);
            }
            return es;
          } as unknown as typeof EventSource;

          (WrappedEventSource as any).__ld_debug_wrapped_es = true;
          (window as any).EventSource = WrappedEventSource;
        }
      } catch (e) {
        console.warn('[LD-debug] failed to wrap EventSource', e);
      }

      // Register a temporary service worker to intercept LD requests and
      // forward them to the local proxy (helps capture requests the SDK
      // initiates before our wrappers run).
      try {
        if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
          navigator.serviceWorker.register('/ld-proxy-sw.js').catch((e) => {
            console.warn('[LD-debug] SW register failed', e);
          });
        }
      } catch (e) {
        console.warn('[LD-debug] SW registration error', e);
      }
    } catch (e) {
      // Never crash the app for debug logging
      // eslint-disable-next-line no-console
      console.error("[LD-debug] failed to install fetch wrapper", e);
    }
    // cleanup: restore originals when component unmounts (or StrictMode re-mounts)
    return () => {
      try {
        if (_origFetch) (window as any).fetch = _origFetch;
      } catch (e) {
        /* ignore */
      }
      try {
        const XHR = (window as any).XMLHttpRequest;
        if (XHR) {
          if (_origXHROpen) XHR.prototype.open = _origXHROpen;
          if (_origXHRSend) XHR.prototype.send = _origXHRSend;
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (_origEventSource) (window as any).EventSource = _origEventSource;
      } catch (e) {
        /* ignore */
      }
    };
  }, [clientSideID, securePayload, options]);

  // Render children immediately instead of blocking until the client 'ready'
  // event. Individual components should safely handle an uninitialized
  // `ldClient` (the hooks return sensible defaults) to avoid a blank screen.

  // Wait until we have either fetched the secure hash or have explicitly
  // decided to proceed without it. Rendering the LDProvider before the
  // secure hash is available can cause the client SDK to POST context
  // without the required secure hash, resulting in 400 errors when the
  // environment is in secure mode. To avoid that, render children while
  // the securePayload is loading and only mount the LDProvider once it's
  // available (or when we've fallen back to the initial context).
  if (!securePayload) {
    return <>{children}</>;
  }

  return (
    <LDProvider
      clientSideID={clientSideID}
      context={securePayload.context ?? initialContext}
      deferInitialization={true}
      options={options}
      reactOptions={{
        useCamelCaseFlagKeys: false,
        sendEventsOnFlagRead: false,
      }}
    >
      {children}
    </LDProvider>
  );
}
