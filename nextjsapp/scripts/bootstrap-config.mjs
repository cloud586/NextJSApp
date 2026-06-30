/**
 * Production entry point: load Azure App Configuration (with Key Vault refs)
 * into process.env, then start New Relic and the Next.js standalone server.
 *
 * Mapping table must stay in sync with lib/config/appConfigKeys.ts.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { load } from "@azure/app-configuration-provider";
import { DefaultAzureCredential } from "@azure/identity";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");

const APP_CONFIG_TO_ENV = {
  "app:ld:sdk-key": "LD_SDK_KEY",
  "app:newrelic:license-key": "NEW_RELIC_LICENSE_KEY",
  "app:newrelic:app-name": "NEW_RELIC_APP_NAME",
  "app:logging:server-level": "LOG_LEVEL",
  "app:logging:client-level": "CLIENT_LOG_LEVEL",
  "app:ld:client-side-id": "LD_CLIENT_SIDE_ID",
};

const CONFIG_REFRESH_INTERVAL_MS = 300_000;

function createCredential() {
  const clientId = process.env.AZURE_CLIENT_ID;
  return new DefaultAzureCredential(
    clientId ? { managedIdentityClientId: clientId } : undefined,
  );
}

function applySettingsToEnv(settings) {
  const loadedKeys = [];

  for (const [appConfigKey, envVar] of Object.entries(APP_CONFIG_TO_ENV)) {
    const value = settings.get(appConfigKey);
    if (value != null && value !== "") {
      process.env[envVar] = String(value);
      loadedKeys.push(envVar);
    }
  }

  return loadedKeys;
}

async function loadAzureConfig() {
  const endpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
  if (!endpoint) {
    console.info(
      "[azure-config] AZURE_APP_CONFIG_ENDPOINT not set; using existing environment variables",
    );
    return;
  }

  const label = process.env.AZURE_APP_CONFIG_LABEL;
  const credential = createCredential();

  const settings = await load(endpoint, credential, {
    selectors: [{ keyFilter: "app:*", labelFilter: label }],
    refreshOptions: {
      enabled: true,
      refreshIntervalInMs: CONFIG_REFRESH_INTERVAL_MS,
    },
    keyVaultOptions: {
      credential,
    },
  });

  const loadedKeys = applySettingsToEnv(settings);

  settings.onRefresh(() => {
    const refreshed = applySettingsToEnv(settings);
    console.info(
      `[azure-config] Refreshed ${refreshed.length} setting(s): ${refreshed.join(", ")}`,
    );
  });

  console.info(
    `[azure-config] Loaded ${loadedKeys.length} setting(s) from App Configuration: ${loadedKeys.join(", ")}`,
  );
}

async function main() {
  try {
    await loadAzureConfig();
  } catch (error) {
    console.error(
      "[azure-config] Failed to load Azure App Configuration:",
      error instanceof Error ? error.message : error,
    );
    if (process.env.AZURE_APP_CONFIG_ENDPOINT) {
      process.exit(1);
    }
  }

  require("newrelic");
  await import("newrelic/esm-loader.mjs");
  require(join(appRoot, "server.js"));
}

main().catch((error) => {
  console.error("[bootstrap] Startup failed:", error);
  process.exit(1);
});
