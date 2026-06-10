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
    vi.unstubAllGlobals();
  });
});
