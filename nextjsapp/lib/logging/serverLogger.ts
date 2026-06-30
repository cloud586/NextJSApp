import pino from "pino";
import { getServerConfig } from "@/lib/config/env";
import { getCorrelationId } from "./correlationId";

const isDev = process.env.NODE_ENV !== "production";

export const serverLogger = pino({
  level: getServerConfig().logLevel,
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }
    : {}),
  mixin: () => {
    // mixin is sync; correlation ID is resolved lazily via child loggers in
    // getRequestLogger when possible. This sync path returns empty when
    // headers() is unavailable at mixin time.
    return {};
  },
});

/**
 * Async helper to build log bindings including correlation ID from request context.
 */
export async function getServerLogBindings(
  extra?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const correlationId = await getCorrelationId();
  return { correlationId, source: "server", ...extra };
}
