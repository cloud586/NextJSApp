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

function getDefaultClientLogLevel(
  clientLogLevel?: string,
): log.LogLevelDesc {
  if (clientLogLevel) {
    return clientLogLevel as log.LogLevelDesc;
  }
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

let rootConfigured = false;
let rootClientLogLevel: string | undefined;

function configureRootLogger(clientLogLevel?: string): void {
  if (rootConfigured && rootClientLogLevel === clientLogLevel) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  log.setLevel(getDefaultClientLogLevel(clientLogLevel));
  rootConfigured = true;
  rootClientLogLevel = clientLogLevel;
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
  clientLogLevel?: string,
): Logger {
  configureRootLogger(clientLogLevel);
  const logger = log.getLogger(name);
  logger.setLevel(getDefaultClientLogLevel(clientLogLevel));

  if (typeof window !== "undefined") {
    wrapWithNewRelic(logger, name, correlationId);
  }

  return logger;
}

/** Reset root configuration — for tests only. */
export function resetClientLoggerForTests(): void {
  rootConfigured = false;
  rootClientLogLevel = undefined;
}
