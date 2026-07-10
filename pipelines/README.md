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
5. **SonarQube Cloud** — [`SonarCloudPrepare@4`](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/azure-pipelines/sonarqube-tasks) → build → test → [`SonarCloudAnalyze@4`](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/azure-pipelines/sonarqube-tasks) → [`SonarCloudPublish@4`](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/azure-pipelines/sonarqube-tasks)
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

### 2. Install marketplace extensions

Install these DevOps extensions in your organization:

| Extension | Marketplace | Provides |
|-----------|-------------|---------|
| [Azure App Configuration](https://marketplace.visualstudio.com/items?itemName=AzureAppConfiguration.azure-app-configuration-tasks) | `AzureAppConfiguration.azure-app-configuration-tasks` | `AzureAppConfigurationExport@10`, `AzureAppConfigurationImport@10` |
| [SonarQube Cloud](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud) | `SonarSource.sonarcloud` | `SonarCloudPrepare@4`, `SonarCloudAnalyze@4`, `SonarCloudPublish@4` |

> Use the **SonarQube Cloud** extension (`SonarSource.sonarcloud`), not the older **SonarQube Server** extension (`SonarSource.sonarqube`). The Server tasks (`SonarQubePrepare@6`, etc.) are a different product and will fail with "task is missing" if only Cloud is installed.

### 3. Register the pipeline

1. Open [sutoremu Pipelines](https://dev.azure.com/SephieBox/sutoremu/_build)
2. **New pipeline** → **GitHub** → authorize if prompted → select your GitHub repo
3. **Existing Azure Pipelines YAML file** → branch `main` → path `/pipelines/nextjs-app.yml`
4. Review and save (first run will wait until service connections exist)
5. Update `devAppConfigEndpoint` / `prodAppConfigEndpoint` in the parent YAML if your `name_prefix` differs from the defaults

Triggers and PR validation use GitHub events (`push` to `main`, `v*` tags, PRs targeting `main`) via the ADO GitHub integration.

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

# Prod (same token or a dedicated prod token)
$kv = terraform -chdir=infra/terraform/environments/prod output -raw key_vault_name
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"
```

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
| `dev-acr` | none | PublishDev stage |
| `prod-acr` | none by default (add manual approval in ADO if desired) | PublishProd stage |

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
