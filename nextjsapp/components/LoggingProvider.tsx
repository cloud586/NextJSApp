"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { CORRELATION_ID_COOKIE } from "@/lib/logging/constants";
import { getClientLogger } from "@/lib/logging/clientLogger";

interface LoggingContextValue {
  correlationId: string | null;
  getLogger: (name: string) => ReturnType<typeof getClientLogger>;
}

const LoggingContext = createContext<LoggingContextValue | null>(null);

function readCorrelationIdFromMeta(): string | null {
  const meta = document.querySelector('meta[name="x-correlation-id"]');
  const content = meta?.getAttribute("content");
  return content && content.trim() !== "" ? content.trim() : null;
}

function readCorrelationIdFromCookie(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CORRELATION_ID_COOKIE}=`));
  if (!match) {
    return null;
  }
  const value = decodeURIComponent(match.split("=")[1] ?? "");
  return value.trim() !== "" ? value.trim() : null;
}

function resolveClientCorrelationId(
  serverCorrelationId?: string | null,
): string | null {
  if (serverCorrelationId) {
    return serverCorrelationId;
  }
  if (typeof window === "undefined") {
    return null;
  }
  return readCorrelationIdFromMeta() ?? readCorrelationIdFromCookie();
}

interface LoggingProviderProps {
  children: ReactNode;
  correlationId?: string | null;
  clientLogLevel?: string;
}

export function LoggingProvider({
  children,
  correlationId: serverCorrelationId,
  clientLogLevel,
}: LoggingProviderProps) {
  const correlationId = useMemo(
    () => resolveClientCorrelationId(serverCorrelationId),
    [serverCorrelationId],
  );

  const value = useMemo<LoggingContextValue>(
    () => ({
      correlationId,
      getLogger: (name: string) =>
        getClientLogger(name, correlationId, clientLogLevel),
    }),
    [correlationId, clientLogLevel],
  );

  return (
    <LoggingContext.Provider value={value}>{children}</LoggingContext.Provider>
  );
}

export function useLogging(): LoggingContextValue {
  const context = useContext(LoggingContext);
  if (!context) {
    throw new Error("useLogging must be used within a LoggingProvider");
  }
  return context;
}

export function useClientLogger(name: string) {
  const { getLogger } = useLogging();
  return getLogger(name);
}
