# Azure DevOps Build Pipelines

Build pipelines for [SephieBox/sutoremu](https://dev.azure.com/SephieBox/sutoremu) using Microsoft-hosted agents (`ubuntu-latest`).

**Configuration source:** CI/CD settings are loaded at runtime from **Azure App Configuration** (with Key Vault references for secrets). No Azure DevOps variable groups are required.

## Structure

```
pipelines/
  alma-base-image.yml                # Parent: Alma base image (alma-ubi)
  nextjs-app.yml                     # Parent: Next.js app (triggers + extends)
  pipeline-templates/
    alma-base-image-build.yml        # Base image build + publish
    node-service-build.yml           # App orchestration + trunk/tag routing + GitVersion
  tech-templates/
    export-app-config.yml             # AzureAppConfigurationExport@10 — read cicd:* keys
    gitversion.yml                    # GitVersion setup/execute + appVersion outputs
    stamp-node-version.yml            # Stamp package.json + APP_VERSION env before build
    git-tag-release.yml               # Annotated vMajor.Minor.Patch push to GitHub
    restore-npm.yml
    build-node.yml
    test-vitest.yml
    sonar-prepare.yml
    sonar-analyze-publish.yml
    docker-build-alma-base.yml
    docker-build-nextjs.yml
    docker-trivy-scan.yml
    docker-push-acr.yml

GitVersion.yml                       # Mainline config (repo root)
base-images/
  alma-ubi/Dockerfile                # Shared Alma Linux base (published as alma-ubi)
```

**Layering:** parent pipeline → pipeline template → tech templates.

**Two pipelines:** the Alma base image is built and published separately so security patches can land on `alma-ubi:latest` before app images rebuild and consume it. App builds **pull** `alma-ubi:latest` from ACR; they no longer build the base inline.

> **Bootstrap:** Register and run **alma-base-image** at least once (publish `alma-ubi:latest`) before app builds can succeed.

## Configuration Keys (App Configuration)

Terraform writes these keys per environment (label = `dev` or `prod`):

| Key | Type | Purpose |
|-----|------|---------|
| `cicd:acr:login-server` | plain | ACR hostname for image push |
| `cicd:acr:name` | plain | ACR resource name |
| `cicd:sonar:organization` | plain | SonarCloud organization key |
| `cicd:sonar:project-key` | plain | SonarCloud project key |
| `cicd:sonar:token` | Key Vault ref | SonarCloud API token (`sonar-token` secret) |
| `cicd:github:tag-push-token` | Key Vault ref | GitHub PAT/token for pushing `v*` tags (`github-tag-push-token` secret) |

The pipeline loads these via [`export-app-config.yml`](tech-templates/export-app-config.yml) using the OOTB [`AzureAppConfigurationExport@10`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-configuration-export-v10) task (`KeyFilter: cicd:*`, `TrimKeyPrefix: cicd:`).

After export, pipeline variables are named:

| App Config key | Pipeline variable |
|----------------|-------------------|
| `cicd:acr:login-server` | `acr:login-server` (aliased to `acrLoginServer` after export — use this in Docker steps; colons break bash `$(var)` expansion) |
| `cicd:acr:name` | `acr:name` |
| `cicd:sonar:organization` | `sonar:organization` |
| `cicd:sonar:project-key` | `sonar:project-key` |
| `cicd:sonar:token` | `sonar:token` (Key Vault ref, resolved by export task) |
| `cicd:github:tag-push-token` | `github:tag-push-token` (Key Vault ref; used by TagRelease) |

> **Import vs Export:** [`AzureAppConfigurationImport@10`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-configuration-import-v10) pushes settings **from a repo config file into** App Configuration (useful for infra/sync pipelines). [`AzureAppConfigurationExport@10`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-configuration-export-v10) reads settings **from** App Configuration into pipeline variables — that is what build pipelines need at runtime.

## Trunk-Based Development Triggers

### Alma base image (`alma-base-image.yml`)

Path filters: `base-images/alma-ubi/**` and related pipeline YAML under `pipelines/`.

| Event | Auto-trigger | Build/scan | Publish |
|-------|--------------|------------|---------|
| PR → `main` (base paths) | yes | build + Trivy | no |
| Merge to `main` (base paths) | yes | build + Trivy | ACR `alma-ubi:latest` (+ build id) |

### Next.js app (`nextjs-app.yml`)

Path filters: `nextjsapp/**`, `pipelines/**`, `GitVersion.yml` (does **not** include `base-images/**`).

| Event | Auto-trigger | Build/test/scan | Publish | Git tag |
|-------|--------------|-----------------|---------|---------|
| PR → `main` | yes | full validation | no | no |
| Merge to `main` | yes | full validation | dev ACR (`Major.Minor.Patch.Revision`) | auto `vMajor.Minor.Patch` after PublishDev |
| Tag `v*` on trunk | yes | full validation | prod ACR (same four-part version) | do not re-tag |
| Push to feature branch (no PR) | no | — | — | — |

## Versioning (GitVersion Mainline)

Canonical version string: **`Major.Minor.Patch.Revision`**.

| Segment | Meaning |
|---------|---------|
| Major / Minor / Patch | GitVersion Mainline; bump with `+semver: major\|minor\|patch` on the merge commit (default Patch) |
| Revision | Commits since version source (`0` on a tagged trunk release) |

- **Git tags:** `vMajor.Minor.Patch` (three-part; GitVersion source of truth)
- **ACR / Docker `APP_VERSION` / logs / Sonar:** four-part `Major.Minor.Patch.Revision`
- **`package.json`:** stamped in CI to three-part `Major.Minor.Patch` only (npm SemVer); not committed
- **Pre-build:** GitVersion → stamp Node env + `package.json` → `npm run build` → Docker `--build-arg APP_VERSION`

Trunk-based rules: single long-lived `main`, short-lived PRs, every successful trunk publish is releasable, no GitFlow release branches.

## Pipeline Flow

### Alma base image

1. **Load config** — `AzureAppConfigurationExport@10` reads `cicd:*` keys (dev)
2. **Docker build** — [`Docker@2`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2) build of `base-images/alma-ubi/Dockerfile`; save image artifact
3. **Trivy scan** — fail on CRITICAL/HIGH vulnerabilities
4. **Publish** (trunk only) — push `alma-ubi:latest` and `alma-ubi:<buildId>` to ACR

### Next.js app

1. **GitVersion** — Mainline calculate; export `appVersion` / `appVersionTag` (cross-stage outputs)
2. **Load config** — `AzureAppConfigurationExport@10` reads `cicd:*` keys (dev store for build; env-specific store for publish)
3. **Restore** — `npm ci` with npm cache
4. **Stamp version** — `package.json` + `APP_VERSION` / `NEXT_PUBLIC_APP_VERSION`
5. **Build** — `npm run lint`, `npm run build` (version env baked into client bundle)
6. **Test** — `npm run test:coverage` (Vitest unit + component)
7. **SonarQube Cloud** — prepare (`sonar.projectVersion`) → analyze → publish
8. **Docker build** — pull `alma-ubi:latest`, build `Dockerfile.runtime` with `APP_VERSION`; save image artifact
9. **Trivy scan** — fail on CRITICAL/HIGH vulnerabilities
10. **PublishDev** (trunk) — push four-part tags to dev ACR
11. **TagRelease** (trunk) — annotated `vMajor.Minor.Patch` → GitHub (triggers prod pipeline)
12. **PublishProd** (tag) — push four-part tags to prod ACR

### Image tags

| Pipeline | Trigger | Config store | Registry | Tags |
|----------|---------|--------------|----------|------|
| alma-base-image | Trunk CI (`main`) | dev | ACR | `latest`, `<buildId>` |
| nextjs-app | Trunk CI (`main`) | dev | ACR | `Major.Minor.Patch.Revision`, `Major.Minor.Patch.Revision-<shortSha>` |
| nextjs-app | Release tag (`v1.2.0`) | prod | ACR | `1.2.0.0`, `1.2.0.0-<shortSha>` |

> Terraform Container Apps still default to `nextjsapp:latest`. Pin `container_image` to a four-part tag manually until a deploy pipeline exists.

## Azure DevOps Setup

**Source repository:** GitHub (connected to the [sutoremu](https://dev.azure.com/SephieBox/sutoremu) Azure DevOps project). Pipeline YAML lives in this repo under `pipelines/`.

### 1. Connect GitHub to Azure DevOps

1. Open [sutoremu Project settings → Service connections](https://dev.azure.com/SephieBox/sutoremu/_settings/adminservices) (or **Project settings → Repositories**).
2. Under **Repositories**, choose **GitHub** and authorize the Azure Pipelines GitHub App (or OAuth) for your GitHub account/org.
3. Select the GitHub repository you are already using for this project and connect it to the ADO project.

### 2. Install marketplace extensions

Install these DevOps extensions in your organization:

| Extension | Marketplace | Provides |
|-----------|-------------|---------|
| [Azure App Configuration](https://marketplace.visualstudio.com/items?itemName=AzureAppConfiguration.azure-app-configuration-tasks) | `AzureAppConfiguration.azure-app-configuration-tasks` | `AzureAppConfigurationExport@10`, `AzureAppConfigurationImport@10` |
| [SonarQube Cloud](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud) | `SonarSource.sonarcloud` | `SonarCloudPrepare@4`, `SonarCloudAnalyze@4`, `SonarCloudPublish@4` |
| [GitTools](https://marketplace.visualstudio.com/items?itemName=gittools.gittools) | `gittools.gittools` | `gitversion-setup@4`, `gitversion-execute@4` |



> Use the **SonarQube Cloud** extension (`SonarSource.sonarcloud`), not the older **SonarQube Server** extension (`SonarSource.sonarqube`). The Server tasks (`SonarQubePrepare@6`, etc.) are a different product and will fail with "task is missing" if only Cloud is installed.

### 3. Register the pipelines

Register **both** pipelines in [sutoremu Pipelines](https://dev.azure.com/SephieBox/sutoremu/_build):

1. **alma-base-image** — **New pipeline** → **GitHub** → **Existing Azure Pipelines YAML file** → path `/pipelines/alma-base-image.yml`
2. **nextjs-app** — same flow → path `/pipelines/nextjs-app.yml`

Run **alma-base-image** on `main` once so `alma-ubi:latest` exists in ACR before relying on nextjs-app Docker builds.

Update `devAppConfigEndpoint` / `prodAppConfigEndpoint` in the parent YAMLs if your `name_prefix` differs from the defaults.

Triggers and PR validation use GitHub events via the ADO GitHub integration.

### 4. Service connections (Terraform)

Apply the [`infra/terraform/ado`](../../infra/terraform/ado) stack after **cicd** + **dev**. It creates and authorizes:

| Name | Type | Purpose | Azure target (current) |
|------|------|---------|------------------------|
| `azure-dev-subscription` | Azure Resource Manager (WIF) | Read App Config | Dev subscription |
| `azure-prod-subscription` | Azure Resource Manager (WIF) | Read App Config | **Same as dev** (prod spooled down) |
| `acr-dev` | Docker Registry | `Docker@2` login/push | Dev ACR |
| `acr-prod` | Docker Registry | `Docker@2` login/push | **Same as** dev ACR |
| `sonarcloud-sutoremu` | SonarCloud | SonarQube Cloud tasks | SonarQube Cloud |

See [Terraform README — Step 2c](../../infra/terraform/README.md#step-2c--azure-devops-service-connections). Requires `AZDO_PERSONAL_ACCESS_TOKEN` and `sonarcloud_token` / `TF_VAR_sonarcloud_token`.

[`Docker@2`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2) uses the Docker Registry connections (not ARM). Credentials come from the cicd stack SP (`client_id` / `client_secret`).

**SonarCloud:** The service connection token is set in the ado stack. At runtime the pipeline still loads `sonar:token` from App Configuration (Key Vault ref) and passes it via `sonar.login` in `SonarCloudPrepare@4` `extraProperties`.

### 5. Terraform — CI/CD principal, RBAC, and config keys

1. Apply [`infra/terraform/cicd`](../../infra/terraform/cicd) (service principal)
2. Apply [`infra/terraform/environments/dev`](../../infra/terraform/environments/dev) — RBAC via remote state `principal_id`
3. Apply [`infra/terraform/ado`](../../infra/terraform/ado) — service connections + environments
4. Verify the App Config endpoint matches the parent pipeline:

```powershell
terraform -chdir=infra/terraform/environments/dev output -raw app_configuration_endpoint
```

### 6. Seed secrets

Run from the **repository root** (`NextJSApp/`):

```powershell
# Dev
$kv = terraform -chdir=infra/terraform/environments/dev output -raw key_vault_name
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"
az keyvault secret set --vault-name $kv --name github-tag-push-token --value "<GitHub PAT with contents:write>"

# Prod (sonar token; github tag push uses the dev export during TagRelease today)
$kv = terraform -chdir=infra/terraform/environments/prod output -raw key_vault_name
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"
az keyvault secret set --vault-name $kv --name github-tag-push-token --value "<GitHub PAT with contents:write>"
```

The GitHub token needs permission to create tags on the source repository (classic PAT: `repo`, or fine-grained: **Contents: Read and write**). Re-apply the App Configuration Terraform module so `cicd:github:tag-push-token` exists, then seed the Key Vault secret before the first TagRelease run.

If you are already inside an environment directory (e.g. `infra/terraform/environments/dev`), omit `-chdir` and use `terraform output` there instead:

```powershell
cd infra/terraform/environments/dev
$kv = terraform output -raw key_vault_name
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"
```

SonarCloud organization and project key are set by Terraform (`cicd:sonar:organization`, `cicd:sonar:project-key`). Override via module variables if needed.

### 7. Environments

Created by the ado Terraform stack (authorized for all pipelines):

| Environment | Approval | Used by |
|-------------|----------|---------|
| `dev-acr` | none | PublishDev (alma-base-image + nextjs-app) |
| `prod-acr` | none by default (add manual approval in ADO if desired) | PublishProd (nextjs-app) |

TagRelease runs as a normal job (not an environment deployment) after PublishDev and pushes `vMajor.Minor.Patch` to GitHub.

### 8. Branch protection on `main` (GitHub)

Configure on **GitHub** (repo → **Settings → Branches → Branch protection rules** for `main`):

- Require a pull request before merging
- Require status checks to pass — add Azure Pipelines `alma-base-image` and `nextjs-app` checks after the first successful runs
- Optional: require reviewers, block force pushes

ADO branch policies for GitHub repos are also available under **Project settings → Repositories** → your GitHub repo → **Policies**, if you prefer managing rules from Azure DevOps.

## Local Verification

```powershell
# From repo root
docker build -f base-images/alma-ubi/Dockerfile -t alma-ubi:latest base-images/alma-ubi

cd nextjsapp
npm ci
$env:APP_VERSION = "0.0.0.0-local"
$env:NEXT_PUBLIC_APP_VERSION = "0.0.0.0-local"
npm run lint
npm run build
npm run test:coverage
docker build -f Dockerfile.runtime --build-arg APP_VERSION=0.0.0.0-local -t nextjsapp:local .
```

## Adding Another Service

1. Add a parent pipeline with service-specific triggers and App Config endpoints
2. Create or reuse a pipeline template
3. Reuse `export-app-config.yml`, `docker-trivy-scan.yml`, `docker-push-acr.yml`
4. Pull `alma-ubi:latest` from ACR in the Docker build step (same pattern as `docker-build-nextjs.yml`)

## Out of Scope (Future)

- Base image version / digest pinning (apps currently consume `latest`)
- Container App deployment — release pipeline
- Static asset upload — release/deploy pipeline
- Cypress e2e — nightly or pre-release pipeline
- Auto-rebuild app images when base `latest` is updated
