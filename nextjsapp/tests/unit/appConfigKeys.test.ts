import { describe, expect, it } from "vitest";
import { APP_CONFIG_TO_ENV } from "@/lib/config/appConfigKeys";

describe("appConfigKeys", () => {
  it("maps app:assets:base-url to NEXT_PUBLIC_ASSETS_BASE_URL", () => {
    expect(APP_CONFIG_TO_ENV["app:assets:base-url"]).toBe(
      "NEXT_PUBLIC_ASSETS_BASE_URL",
    );
  });
});
