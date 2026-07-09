import { describe, expect, it } from "vitest";
import { AUTH_SIGNUP_ENABLED } from "@/lib/ldFlags";

describe("ldFlags", () => {
  it("AUTH_SIGNUP_ENABLED matches Terraform flag key", () => {
    expect(AUTH_SIGNUP_ENABLED).toBe("auth.signupEnabled");
  });
});
