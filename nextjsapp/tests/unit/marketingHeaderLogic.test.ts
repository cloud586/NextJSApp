import { describe, expect, it } from "vitest";
import { shouldShowSignup } from "@/lib/marketing/marketingHeaderLogic";

describe("shouldShowSignup", () => {
  it("returns false when LaunchDarkly is not configured", () => {
    expect(shouldShowSignup(false, true)).toBe(false);
    expect(shouldShowSignup(false, false)).toBe(false);
  });

  it("returns false when flag is off", () => {
    expect(shouldShowSignup(true, false)).toBe(false);
  });

  it("returns true when LD is configured and flag is on", () => {
    expect(shouldShowSignup(true, true)).toBe(true);
  });
});
