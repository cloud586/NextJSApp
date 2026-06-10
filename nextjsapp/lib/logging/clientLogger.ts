import log from "loglevel";
import type { Logger } from "loglevel";

const LOGLEVEL_METHODS = ["trace", "debug", "info", "warn", "error"] as const;
type LoglevelMethod = (typeof LOGLEVEL_METHODS)[number];

const NR_LEVEL_MAP: Record<LoglevelMethod, string> = {
  trace: "trace",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

declare global {
  interface Window {
    newrelic?: {
      wrapLogger: (
        parent: object,
        methodName: string,
        options?: {
          level?: string;
          customAttributes?: Record<string, unknown>;
        },
      ) => void;
    };
  }
}

function getDefaultClientLogLevel(): log.LogLevelDesc {
  if (process.env.NEXT_PUBLIC_LOG_LEVEL) {
    return process.env.NEXT_PUBLIC_LOG_LEVEL as log.LogLevelDesc;
  }
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

let rootConfigured = false;

function configureRootLogger(): void {
  if (rootConfigured || typeof window === "undefined") {
    return;
  }
  log.setLevel(getDefaultClientLogLevel());
  rootConfigured = true;
}

function wrapWithNewRelic(
  logger: Logger,
  name: string,
  correlationId: string | null,
): void {
  const nr = window.newrelic;
  if (!nr?.wrapLogger) {
    return;
  }

  for (const method of LOGLEVEL_METHODS) {
    if (typeof logger[method] !== "function") {
      continue;
    }
    nr.wrapLogger(logger, method, {
      level: NR_LEVEL_MAP[method],
      customAttributes: {
        correlationId,
        logger: name,
        source: "client",
      },
    });
  }
}

/**
 * Returns a named loglevel logger, optionally wired to New Relic browser logs.
 */
export function getClientLogger(
  name: string,
  correlationId: string | null = null,
): Logger {
  configureRootLogger();
  const logger = log.getLogger(name);
  logger.setLevel(getDefaultClientLogLevel());

  if (typeof window !== "undefined") {
    wrapWithNewRelic(logger, name, correlationId);
  }

  return logger;
}

/** Reset root configuration — for tests only. */
export function resetClientLoggerForTests(): void {
  rootConfigured = false;
}
