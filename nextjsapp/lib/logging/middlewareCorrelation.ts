import { NextResponse, type NextRequest } from "next/server";
import {
  CORRELATION_ID_COOKIE,
  X_CORRELATION_ID,
} from "./constants";
import { resolveCorrelationId } from "./correlationId";

export interface CorrelationMiddlewareResult {
  correlationId: string;
  requestHeaders: Headers;
}

/**
 * Pure middleware helper: resolve correlation ID and build forwarded request headers.
 */
export function applyCorrelationId(request: NextRequest): CorrelationMiddlewareResult {
  const correlationId = resolveCorrelationId(request.headers);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(X_CORRELATION_ID, correlationId);

  return { correlationId, requestHeaders };
}

export function setCorrelationResponseHeaders(
  response: NextResponse,
  correlationId: string,
): void {
  response.headers.set(X_CORRELATION_ID, correlationId);
  response.cookies.set(CORRELATION_ID_COOKIE, correlationId, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
  });
}
