import { afterEach, describe, expect, it } from "vitest";
import { getAssetUrl } from "@/lib/assets";

describe("getAssetUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns local /public path when base URL is unset", () => {
    delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;

    expect(getAssetUrl("hero-placeholder.svg")).toBe("/hero-placeholder.svg");
  });

  it("normalizes leading slash on path when base URL is unset", () => {
    delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;

    expect(getAssetUrl("/hero-placeholder.svg")).toBe("/hero-placeholder.svg");
  });

  it("builds blob URL when base URL is set", () => {
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL =
      "https://acct.blob.core.windows.net/assets";

    expect(getAssetUrl("hero-placeholder.svg")).toBe(
      "https://acct.blob.core.windows.net/assets/hero-placeholder.svg",
    );
  });

  it("strips trailing slash from base URL", () => {
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL =
      "https://acct.blob.core.windows.net/assets/";

    expect(getAssetUrl("hero-placeholder.svg")).toBe(
      "https://acct.blob.core.windows.net/assets/hero-placeholder.svg",
    );
  });

  it("builds CDN URL when CDN base URL is set", () => {
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://cdn.example.com/assets";

    expect(getAssetUrl("hero-placeholder.svg")).toBe(
      "https://cdn.example.com/assets/hero-placeholder.svg",
    );
  });
});
