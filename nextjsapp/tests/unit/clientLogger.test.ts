import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getClientLogger,
  resetClientLoggerForTests,
} from "@/lib/logging/clientLogger";

describe("clientLogger", () => {
  let previousAppVersion: string | undefined;

  beforeEach(() => {
    previousAppVersion = process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.NEXT_PUBLIC_APP_VERSION;
  });

  afterEach(() => {
    resetClientLoggerForTests();
    vi.unstubAllGlobals();
    delete window.newrelic;
    if (previousAppVersion === undefined) {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
    } else {
      process.env.NEXT_PUBLIC_APP_VERSION = previousAppVersion;
    }
  });

  it("returns a named loglevel logger", () => {
    const logger = getClientLogger("TestComponent", "corr-1");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("wraps loglevel methods with newrelic when agent is present", () => {
    const wrapLogger = vi.fn();
    window.newrelic = { wrapLogger };

    getClientLogger("WrappedLogger", "corr-2");

    expect(wrapLogger).toHaveBeenCalled();
    const firstCall = wrapLogger.mock.calls[0];
    expect(firstCall?.[1]).toBe("trace");
    expect(firstCall?.[2]).toMatchObject({
      customAttributes: {
        correlationId: "corr-2",
        logger: "WrappedLogger",
        source: "client",
        appVersion: "0.0.0.0-local",
      },
    });
  });

  it("skips newrelic wrapping when agent is absent", () => {
    const logger = getClientLogger("NoNR", null);
    expect(logger.warn).toBeDefined();
  });

  it("uses NEXT_PUBLIC_APP_VERSION when set", () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "1.2.3.0";
    const wrapLogger = vi.fn();
    window.newrelic = { wrapLogger };

    getClientLogger("VersionedLogger", "corr-3");

    expect(wrapLogger.mock.calls[0]?.[2]).toMatchObject({
      customAttributes: {
        appVersion: "1.2.3.0",
      },
    });
  });
});
