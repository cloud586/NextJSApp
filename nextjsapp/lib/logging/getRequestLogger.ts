import type { Logger } from "pino";
import { getServerLogBindings, serverLogger } from "./serverLogger";

/**
 * Returns a request-scoped Pino child logger with correlationId attached.
 */
export async function getRequestLogger(
  bindings?: Record<string, unknown>,
): Promise<Logger> {
  const logBindings = await getServerLogBindings(bindings);
  return serverLogger.child(logBindings);
}
