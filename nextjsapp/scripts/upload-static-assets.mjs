/**
 * Upload static image assets from public/ to Azure Blob Storage.
 *
 * Requires Azure CLI (az) logged in, or managed identity when run in CI.
 *
 * Environment variables (or set in .env.local):
 *   AZURE_STORAGE_ACCOUNT_NAME  — storage account name
 *   AZURE_STORAGE_CONTAINER_NAME — container name (default: assets)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(__dirname, "..");
const publicDir = join(appRoot, "public");

const IMAGE_EXTENSIONS = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
]);

// No spaces — avoids Windows shell splitting on commas in --content-cache-control
const CACHE_CONTROL = "public,max-age=31536000,immutable";

function loadEnvLocal() {
  const envPath = join(appRoot, ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function listImageFiles() {
  return readdirSync(publicDir).filter((file) =>
    IMAGE_EXTENSIONS.has(extname(file).toLowerCase()),
  );
}

function uploadFile(fileName, accountName, containerName) {
  const filePath = join(publicDir, fileName);
  const args = [
    "storage",
    "blob",
    "upload",
    "--auth-mode",
    "login",
    "--account-name",
    accountName,
    "--container-name",
    containerName,
    "--name",
    fileName,
    "--file",
    filePath,
    "--content-cache-control",
    CACHE_CONTROL,
    "--overwrite",
  ];

  const isWindows = process.platform === "win32";
  const result = spawnSync(isWindows ? "az.cmd" : "az", args, {
    stdio: "inherit",
    // Windows: az is az.cmd; Node needs shell to resolve it on PATH.
    shell: isWindows,
  });

  if (result.error) {
    console.error(
      "[upload-assets] Failed to run az CLI:",
      result.error.message,
    );
    if (result.error.code === "ENOENT") {
      console.error(
        "  Install Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli-windows",
      );
      console.error("  Then run: az login");
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function uploadFiles(files, accountName, containerName) {
  if (files.length === 0) {
    console.info("[upload-assets] No image files found in public/");
    return;
  }

  for (const file of files) {
    uploadFile(file, accountName, containerName);
  }

  console.info(
    `[upload-assets] Uploaded ${files.length} file(s) to ${containerName} on ${accountName}`,
  );
}

function main() {
  loadEnvLocal();

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "assets";

  if (!accountName) {
    console.error(
      "[upload-assets] AZURE_STORAGE_ACCOUNT_NAME is required.",
    );
    console.error(
      "  PowerShell: $env:AZURE_STORAGE_ACCOUNT_NAME = \"nextjsappdevst\"",
    );
    console.error(
      "  Or add AZURE_STORAGE_ACCOUNT_NAME to nextjsapp/.env.local",
    );
    process.exit(1);
  }

  const files = listImageFiles();
  console.info(
    `[upload-assets] Found ${files.length} image file(s): ${files.join(", ") || "(none)"}`,
  );
  uploadFiles(files, accountName, containerName);
}

main();
