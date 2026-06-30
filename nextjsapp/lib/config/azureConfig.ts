import { load } from "@azure/app-configuration-provider";
import { DefaultAzureCredential } from "@azure/identity";
import {
  APP_CONFIG_KEY_FILTER,
  APP_CONFIG_TO_ENV,
  CONFIG_REFRESH_INTERVAL_MS,
} from "./appConfigKeys";

let refreshStarted = false;

function createCredential(): DefaultAzureCredential {
  const clientId = process.env.AZURE_CLIENT_ID;
  return new DefaultAzureCredential(
    clientId ? { managedIdentityClientId: clientId } : undefined,
  );
}

function applySettingsToEnv(
  settings: Awaited<ReturnType<typeof load>>,
): string[] {
  const loadedKeys: string[] = [];

  for (const [appConfigKey, envVar] of Object.entries(APP_CONFIG_TO_ENV)) {
    const value = settings.get(appConfigKey);
    if (value != null && value !== "") {
      process.env[envVar] = String(value);
      loadedKeys.push(envVar);
    }
  }

  return loadedKeys;
}

function startRefreshListener(
  settings: Awaited<ReturnType<typeof load>>,
): void {
  if (refreshStarted) {
    return;
  }
  refreshStarted = true;

  settings.onRefresh(() => {
    const refreshed = applySettingsToEnv(settings);
    console.info(
      `[azure-config] Refreshed ${refreshed.length} setting(s): ${refreshed.join(", ")}`,
    );
  });
}

/**
 * Loads configuration from Azure App Configuration (including Key Vault
 * references) into process.env. No-op when AZURE_APP_CONFIG_ENDPOINT is unset
 * so local .env.local continues to work.
 */
export async function loadAzureConfig(): Promise<void> {
  const endpoint = process.env.AZURE_APP_CONFIG_ENDPOINT;
  if (!endpoint) {
    return;
  }

  const label = process.env.AZURE_APP_CONFIG_LABEL;
  const credential = createCredential();

  const settings = await load(endpoint, credential, {
    selectors: [{ keyFilter: APP_CONFIG_KEY_FILTER, labelFilter: label }],
    refreshOptions: {
      enabled: true,
      refreshIntervalInMs: CONFIG_REFRESH_INTERVAL_MS,
    },
    keyVaultOptions: {
      credential,
    },
  });

  const loadedKeys = applySettingsToEnv(settings);
  startRefreshListener(settings);

  console.info(
    `[azure-config] Loaded ${loadedKeys.length} setting(s) from App Configuration: ${loadedKeys.join(", ")}`,
  );
}
