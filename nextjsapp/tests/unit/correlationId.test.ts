import { describe, expect, it, vi } from "vitest";
import {
  getCorrelationIdFromHeaders,
  resolveCorrelationId,
} from "@/lib/logging/correlationId";
import { X_CORRELATION_ID } from "@/lib/logging/constants";

describe("correlationId helpers", () => {
  it("returns correlation id from headers when present", () => {
    const headers = new Headers({ [X_CORRELATION_ID]: "abc-123" });
    expect(getCorrelationIdFromHeaders(headers)).toBe("abc-123");
  });

  it("returns null when header is missing or blank", () => {
    expect(getCorrelationIdFromHeaders(new Headers())).toBeNull();
    expect(
      getCorrelationIdFromHeaders(new Headers({ [X_CORRELATION_ID]: "  " })),
    ).toBeNull();
  });

  it("trims whitespace from header value", () => {
    const headers = new Headers({ [X_CORRELATION_ID]: "  id-1  " });
    expect(getCorrelationIdFromHeaders(headers)).toBe("id-1");
  });

  it("resolveCorrelationId reuses incoming id", () => {
    const headers = new Headers({ [X_CORRELATION_ID]: "existing-id" });
    expect(resolveCorrelationId(headers)).toBe("existing-id");
  });

  it("resolveCorrelationId generates uuid when missing", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "generated-uuid",
    });
    expect(resolveCorrelationId(new Headers())).toBe("generated-uuid");
    vi.unstubAllGlobals();
  });
});
