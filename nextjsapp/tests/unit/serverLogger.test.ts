import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";
import { getServerLogBindings } from "@/lib/logging/serverLogger";
import { X_CORRELATION_ID } from "@/lib/logging/constants";

describe("serverLogger bindings", () => {
  beforeEach(() => {
    vi.mocked(headers).mockReset();
  });

  it("includes correlationId from request headers", async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ [X_CORRELATION_ID]: "server-corr" }) as never,
    );

    const bindings = await getServerLogBindings({ route: "test" });

    expect(bindings).toMatchObject({
      correlationId: "server-corr",
      source: "server",
      appVersion: "0.0.0.0-local",
      route: "test",
    });
  });

  it("falls back to generated uuid outside request context", async () => {
    vi.mocked(headers).mockRejectedValue(new Error("no request store"));
    vi.stubGlobal("crypto", {
      randomUUID: () => "fallback-uuid",
    });

    const bindings = await getServerLogBindings();

    expect(bindings.correlationId).toBe("fallback-uuid");
    expect(bindings.appVersion).toBe("0.0.0.0-local");
    vi.unstubAllGlobals();
  });

  it("uses APP_VERSION from the environment when set", async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ [X_CORRELATION_ID]: "server-corr" }) as never,
    );
    const previous = process.env.APP_VERSION;
    process.env.APP_VERSION = "1.2.3.0";

    try {
      const bindings = await getServerLogBindings();
      expect(bindings.appVersion).toBe("1.2.3.0");
    } finally {
      if (previous === undefined) {
        delete process.env.APP_VERSION;
      } else {
        process.env.APP_VERSION = previous;
      }
    }
  });
});
