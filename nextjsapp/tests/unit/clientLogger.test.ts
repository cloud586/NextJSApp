import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getClientLogger,
  resetClientLoggerForTests,
} from "@/lib/logging/clientLogger";

describe("clientLogger", () => {
  afterEach(() => {
    resetClientLoggerForTests();
    vi.unstubAllGlobals();
    delete window.newrelic;
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
      },
    });
  });

  it("skips newrelic wrapping when agent is absent", () => {
    const logger = getClientLogger("NoNR", null);
    expect(logger.warn).toBeDefined();
  });
});
