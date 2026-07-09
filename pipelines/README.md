# Azure DevOps Build Pipelines

Build pipelines for [SephieBox/sutoremu](https://dev.azure.com/SephieBox/sutoremu) using Microsoft-hosted agents (`ubuntu-latest`).

**Configuration source:** CI/CD settings are loaded at runtime from **Azure App Configuration** (with Key Vault references for secrets). No Azure DevOps variable groups are required.

## Structure

```
pipelines/
  nextjs-app.yml                     # Parent pipeline (triggers + extends)
  pipeline-templates/
    node-service-build.yml           # Orchestration + trunk/tag routing
  tech-templates/
    export-app-config.yml             # AzureAppConfigurationExport@10 — read cicd:* keys
    restore-npm.yml
    build-node.yml
    test-vitest.yml
    sonar-prepare.yml
    sonar-analyze-publish.yml
    docker-build-nextjs.yml
    docker-trivy-scan.yml
    docker-push-acr.yml
```

**Layering:** parent pipeline → pipeline template → tech templates.

## Configuration Keys (App Configuration)

Terraform writes these keys per environment (label = `dev` or `prod`):

| Key | Type | Purpose |
|-----|------|---------|
| `cicd:acr:login-server` | plain | ACR hostname for image push |
| `cicd:acr:name` | plain | ACR resource name |
| `cicd:sonar:organization` | plain | SonarCloud organization key |
| `cicd:sonar:project-key` | plain | SonarCloud project key |
| `cicd:sonar:token` | Key Vault ref | SonarCloud API token (`sonar-token` secret) |

The pipeline loads these via [`export-app-config.yml`](tech-templates/export-app-config.yml) using the OOTB [`AzureAppConfigurationExport@10`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-configuration-export-v10) task (`KeyFilter: cicd:*`, `TrimKeyPrefix: cicd:`).

After export, pipeline variables are named:

| App Config key | Pipeline variable |
|----------------|-------------------|
| `cicd:acr:login-server` | `acr:login-server` |
| `cicd:acr:name` | `acr:name` |
| `cicd:sonar:organization` | `sonar:organization` |
| `cicd:sonar:project-key` | `sonar:project-key` |
| `cicd:sonar:token` | `sonar:token` (Key Vault ref, resolved by export task) |

> **Import vs Export:** [`AzureAppConfigurationImport@10`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-configuration-import-v10) pushes settings **from a repo config file into** App Configuration (useful for infra/sync pipelines). [`AzureAppConfigurationExport@10`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-app-configuration-export-v10) reads settings **from** App Configuration into pipeline variables — that is what build pipelines need at runtime.

## Trunk-Based Development Triggers

| Event | Auto-trigger | Build/test/scan | Publish |
|-------|--------------|-----------------|---------|
| PR → `main` | yes | full validation | no |
| Merge to `main` | yes | full validation | dev ACR |
| Tag `v*` on trunk | yes | full validation | prod ACR |
| Push to feature branch (no PR) | no | — | — |

## Pipeline Flow

1. **Load config** — `AzureAppConfigurationExport@10` reads `cicd:*` keys (dev store for build; env-specific store for publish)
2. **Restore** — `npm ci` with npm cache
3. **Build** — `npm run lint`, `npm run build`
4. **Test** — `npm run test:coverage` (Vitest unit + component)
5. **SonarQube** — [`SonarQubePrepare@6`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-prepare-v6) → build → test → [`SonarQubeAnalyze@6`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-analyze-v6) → [`SonarQubePublish@6`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-publish-v6)
6. **Docker build** — [`Docker@2`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2) `build` for `Dockerfile.base` + `Dockerfile.runtime`; save image artifact
7. **Trivy scan** — fail on CRITICAL/HIGH vulnerabilities
8. **Publish** (conditional) — [`Docker@2`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2) `login` + `push` to dev or prod ACR

### Image tags

| Trigger | Config store | Registry | Tags |
|---------|--------------|----------|------|
| Trunk CI (`main`) | dev | dev ACR | `main-<buildId>`, `main-<shortSha>` |
| Release tag (`v1.2.0`) | prod | prod ACR | `v1.2.0`, `v1.2.0-<buildId>` |

## Azure DevOps Setup

**Source repository:** GitHub (connected to the [sutoremu](https://dev.azure.com/SephieBox/sutoremu) Azure DevOps project). Pipeline YAML lives in this repo under `pipelines/`.

### 1. Connect GitHub to Azure DevOps

1. Open [sutoremu Project settings → Service connections](https://dev.azure.com/SephieBox/sutoremu/_settings/adminservices) (or **Project settings → Repositories**).
2. Under **Repositories**, choose **GitHub** and authorize the Azure Pipelines GitHub App (or OAuth) for your GitHub account/org.
3. Select the GitHub repository you are already using for this project and connect it to the ADO project.

### 2. Install the Azure App Configuration extension

Install the [Azure App Configuration](https://marketplace.visualstudio.com/items?itemName=AzureAppConfiguration.azure-app-configuration-tasks) DevOps extension in your organization. This provides `AzureAppConfigurationExport@10` and `AzureAppConfigurationImport@10`.

### 3. Register the pipeline

1. Open [sutoremu Pipelines](https://dev.azure.com/SephieBox/sutoremu/_build)
2. **New pipeline** → **GitHub** → authorize if prompted → select your GitHub repo
3. **Existing Azure Pipelines YAML file** → branch `main` → path `/pipelines/nextjs-app.yml`
4. Review and save (first run will wait until service connections exist)
5. Update `devAppConfigEndpoint` / `prodAppConfigEndpoint` in the parent YAML if your `name_prefix` differs from the defaults

Triggers and PR validation use GitHub events (`push` to `main`, `v*` tags, PRs targeting `main`) via the ADO GitHub integration.

### 4. Service connections

Create under **Project settings → Service connections**:

| Name | Type | Purpose |
|------|------|---------|
| `azure-dev-subscription` | Azure Resource Manager | Read dev App Config |
| `azure-prod-subscription` | Azure Resource Manager | Read prod App Config |
| `acr-dev` | Docker Registry | `Docker@2` login/push to dev ACR |
| `acr-prod` | Docker Registry | `Docker@2` login/push to prod ACR |
| `sonarcloud-sutoremu` | SonarQube | SonarCloud endpoint (`https://sonarcloud.io`) |

**Azure connections:** workload identity federation or service principal; needs **App Configuration Data Reader** on each store and **AcrPush** on ACR.

[`Docker@2`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2) requires a **Docker Registry** service connection (not ARM). Create one per ACR using your SPN credentials — see [Microsoft docs](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2#dockerV2-only-supports-docker-registry-service-connection-and-not-support-arm-service-connection-how-can-i-use-an-existing-azure-service-principal-spn-for-authentication-in-docker-task):

| Field | Value |
|-------|-------|
| Docker Registry | `https://<acr-name>.azurecr.io` |
| Docker ID | `terraform output -raw client_id` (cicd stack) |
| Password | `terraform output -raw client_secret` (cicd stack) |

Name them `acr-dev` and `acr-prod` (or map to the `acrServiceConnection` parameter in the pipeline template).

**SonarQube connection:** Create a [SonarQube service connection](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarqube-extension-for-azure-devops/) pointing to `https://sonarcloud.io`. The API token is loaded at runtime from App Configuration (`sonar:token` via Key Vault ref) and passed through `sonar.login` in `SonarQubePrepare@6` `extraProperties` — the service connection is required by the task but the token value comes from Azure, not ADO variable groups.

### 5. Terraform — CI/CD principal and config keys

1. Apply the [`infra/terraform/cicd`](../../infra/terraform/cicd) stack (creates the service principal — see [Terraform README](../../infra/terraform/README.md#step-2b--cicd-service-principal-one-time))
2. `terraform apply` dev and prod — RBAC is granted automatically via remote state `principal_id`
3. Verify endpoints match the parent pipeline:

```powershell
terraform -chdir=infra/terraform/environments/dev output -raw app_configuration_endpoint
terraform -chdir=infra/terraform/environments/prod output -raw app_configuration_endpoint
```

### 6. Seed secrets

```powershell
# Dev
$kv = terraform -chdir=infra/terraform/environments/dev output -raw key_vault_name
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"

# Prod (same token or a dedicated prod token)
$kv = terraform -chdir=infra/terraform/environments/prod output -raw key_vault_name
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"
```

SonarCloud organization and project key are set by Terraform (`cicd:sonar:organization`, `cicd:sonar:project-key`). Override via module variables if needed.

### 7. Environments

| Environment | Approval | Used by |
|-------------|----------|---------|
| `dev-acr` | none | PublishDev stage |
| `prod-acr` | optional manual approval | PublishProd stage |

### 8. Branch protection on `main` (GitHub)

Configure on **GitHub** (repo → **Settings → Branches → Branch protection rules** for `main`):

- Require a pull request before merging
- Require status checks to pass — add the Azure Pipelines `nextjs-app` check after the first successful run
- Optional: require reviewers, block force pushes

ADO branch policies for GitHub repos are also available under **Project settings → Repositories** → your GitHub repo → **Policies**, if you prefer managing rules from Azure DevOps.

## Local Verification

```powershell
cd nextjsapp
npm ci
npm run lint
npm run build
npm run test:coverage
docker build -f Dockerfile.base -t alma-ubi:latest .
docker build -f Dockerfile.runtime -t nextjsapp:local .
```

## Adding Another Service

1. Add a parent pipeline with service-specific triggers and App Config endpoints
2. Create or reuse a pipeline template
3. Reuse `export-app-config.yml`, `docker-trivy-scan.yml`, `docker-push-acr.yml`

## Out of Scope (Future)

- Container App deployment — release pipeline
- Static asset upload — release/deploy pipeline
- Cypress e2e — nightly or pre-release pipeline
