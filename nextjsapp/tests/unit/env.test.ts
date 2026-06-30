import { afterEach, describe, expect, it } from "vitest";
import {
  getServerConfig,
  isLDClientConfigured,
  isLDSdkConfigured,
  isNewRelicConfigured,
} from "@/lib/config/env";

describe("env", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reads server config from process.env", () => {
    process.env.LD_SDK_KEY = "sdk-test";
    process.env.LD_CLIENT_SIDE_ID = "client-test";
    process.env.NEW_RELIC_LICENSE_KEY = "nr-test";
    process.env.LOG_LEVEL = "debug";
    process.env.CLIENT_LOG_LEVEL = "error";

    expect(getServerConfig()).toEqual({
      ldSdkKey: "sdk-test",
      ldClientSideId: "client-test",
      newRelicAppName: "nextjsapp",
      newRelicLicenseKey: "nr-test",
      logLevel: "debug",
      clientLogLevel: "error",
    });
    expect(isLDSdkConfigured()).toBe(true);
    expect(isLDClientConfigured()).toBe(true);
    expect(isNewRelicConfigured()).toBe(true);
  });

  it("applies defaults when optional values are unset", () => {
    delete process.env.LD_SDK_KEY;
    delete process.env.LD_CLIENT_SIDE_ID;
    delete process.env.NEW_RELIC_LICENSE_KEY;
    delete process.env.LOG_LEVEL;
    delete process.env.CLIENT_LOG_LEVEL;

    expect(getServerConfig().newRelicAppName).toBe("nextjsapp");
    expect(getServerConfig().logLevel).toBe("info");
    expect(getServerConfig().clientLogLevel).toBe("warn");
    expect(isLDSdkConfigured()).toBe(false);
    expect(isLDClientConfigured()).toBe(false);
    expect(isNewRelicConfigured()).toBe(false);
  });
});
