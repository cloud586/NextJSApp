/**
 * Next.js standalone file tracing copies only a subset of runtime dependencies.
 * Copies full dependency trees for New Relic and Azure App Configuration bootstrap.
 *
 * Env overrides (used by Dockerfile.runtime):
 *   SOURCE_NODE_MODULES — source node_modules dir (default: <project>/node_modules)
 *   STANDALONE_DIR      — standalone output dir (default: <project>/.next/standalone)
 */
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = process.env.STANDALONE_DIR ?? join(root, ".next", "standalone");
const srcModules = process.env.SOURCE_NODE_MODULES ?? join(root, "node_modules");
const destModules = join(standaloneDir, "node_modules");

if (!existsSync(standaloneDir)) {
  console.error(`Standalone output not found at ${standaloneDir}.`);
  process.exit(1);
}

if (!existsSync(srcModules)) {
  console.error(`Source node_modules not found at ${srcModules}.`);
  process.exit(1);
}

mkdirSync(destModules, { recursive: true });

/** @param {string} name */
function resolvePackageDir(name) {
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    return join(srcModules, scope, pkg);
  }
  return join(srcModules, name);
}

/** @param {string} name @param {string} modulesRoot */
function destPackageDir(name, modulesRoot) {
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    return join(modulesRoot, scope, pkg);
  }
  return join(modulesRoot, name);
}

/** @param {string} pkgDir @returns {string[]} */
function getDependencyNames(pkgDir) {
  const pkgJsonPath = join(pkgDir, "package.json");
  if (!existsSync(pkgJsonPath)) {
    return [];
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  return [
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.optionalDependencies ?? {}),
  ];
}

/** @param {string} rootName */
function collectTransitiveDeps(rootName) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const queue = [rootName];

  while (queue.length > 0) {
    const name = queue.shift();
    if (!name || seen.has(name)) {
      continue;
    }

    const pkgDir = resolvePackageDir(name);
    if (!existsSync(pkgDir)) {
      continue;
    }

    seen.add(name);
    for (const dep of getDependencyNames(pkgDir)) {
      if (!seen.has(dep)) {
        queue.push(dep);
      }
    }
  }

  return [...seen];
}

// Optional native addons lock .node binaries on Windows and are not required
// for the agent to start (NR logs "Not adding native metric sampler" without them).
const SKIP_PACKAGES = new Set([
  "@newrelic/native-metrics",
  "@newrelic/fn-inspect",
  "@datadog/pprof",
]);

const ROOT_PACKAGES = [
  "newrelic",
  "@azure/app-configuration-provider",
  "@azure/identity",
];

const packages = [
  ...new Set(
    ROOT_PACKAGES.flatMap((root) => collectTransitiveDeps(root)).filter(
      (name) => !SKIP_PACKAGES.has(name),
    ),
  ),
];

for (const name of packages) {
  const srcPath = resolvePackageDir(name);
  const destPath = destPackageDir(name, destModules);

  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(srcPath, destPath, { recursive: true, force: true });
}

console.log(
  `Synced ${packages.length} runtime package(s) into ${standaloneDir}.`,
);
