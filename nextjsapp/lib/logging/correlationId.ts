import { headers } from "next/headers";
import { X_CORRELATION_ID } from "./constants";

export function getCorrelationIdFromHeaders(
  requestHeaders: Headers,
): string | null {
  const value = requestHeaders.get(X_CORRELATION_ID);
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
}

export function resolveCorrelationId(
  requestHeaders: Headers,
): string {
  return getCorrelationIdFromHeaders(requestHeaders) ?? crypto.randomUUID();
}

/**
 * Read the correlation ID from the current request context.
 * Falls back to a new UUID when called outside a request (e.g. dev safety net).
 */
export async function getCorrelationId(): Promise<string> {
  try {
    const requestHeaders = await headers();
    return resolveCorrelationId(requestHeaders);
  } catch {
    return crypto.randomUUID();
  }
}
