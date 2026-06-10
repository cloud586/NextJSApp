/**
 * Remove the previous standalone output before building.
 * A prior New Relic sync can leave locked .node binaries on Windows that
 * cause EPERM when Next.js tries to rebuild standalone.
 */
import { existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  process.exit(0);
}

try {
  rmSync(standaloneDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log("Removed previous standalone output.");
} catch {
  const quarantine = `${standaloneDir}.stale-${Date.now()}`;
  try {
    renameSync(standaloneDir, quarantine);
    console.log(`Quarantined previous standalone output to ${quarantine}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Could not remove or quarantine ${standaloneDir}: ${message}\n` +
        "A prior `node server.js` from .next/standalone is likely still running.\n" +
        "Stop it (e.g. end the terminal or Task Manager → node.exe running server.js), then rerun npm run build.",
    );
    process.exit(1);
  }
}
