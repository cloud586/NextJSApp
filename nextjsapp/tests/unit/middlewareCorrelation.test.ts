import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  applyCorrelationId,
  setCorrelationResponseHeaders,
} from "@/lib/logging/middlewareCorrelation";
import {
  CORRELATION_ID_COOKIE,
  X_CORRELATION_ID,
} from "@/lib/logging/constants";

describe("middlewareCorrelation", () => {
  it("applyCorrelationId forwards existing header", () => {
    const request = new NextRequest("http://localhost/", {
      headers: { [X_CORRELATION_ID]: "req-99" },
    });

    const result = applyCorrelationId(request);

    expect(result.correlationId).toBe("req-99");
    expect(result.requestHeaders.get(X_CORRELATION_ID)).toBe("req-99");
  });

  it("applyCorrelationId generates id when header missing", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "new-id",
    });

    const request = new NextRequest("http://localhost/");
    const result = applyCorrelationId(request);

    expect(result.correlationId).toBe("new-id");
    expect(result.requestHeaders.get(X_CORRELATION_ID)).toBe("new-id");

    vi.unstubAllGlobals();
  });

  it("setCorrelationResponseHeaders sets header and cookie", () => {
    const response = NextResponse.next();

    setCorrelationResponseHeaders(response, "corr-42");

    expect(response.headers.get(X_CORRELATION_ID)).toBe("corr-42");
    const cookie = response.cookies.get(CORRELATION_ID_COOKIE);
    expect(cookie?.value).toBe("corr-42");
  });
});
