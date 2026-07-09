# Terraform — Azure App Configuration + Key Vault + Container Apps

Infrastructure for the Next.js app: Key Vault (secrets), App Configuration (settings + KV references), Log Analytics, **Azure Container Registry**, and Azure Container Apps with a user-assigned managed identity.

## Architecture

```
Container App (UAMI)
  → App Configuration Data Reader
  → Key Vault Secrets User (via KV refs resolved by App Config provider)
  → AcrPull (on dedicated ACR)

bootstrap-config.mjs (on container start)
  → DefaultAzureCredential (pinned to UAMI via AZURE_CLIENT_ID)
  → load App Configuration (label = environment)
  → resolve Key Vault references
  → populate process.env
  → require('newrelic')
  → require('server.js')
```

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.5
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) logged in (`az login`)
- Subscription with permissions to create resource groups, Key Vault, App Configuration, Container Apps, ACR, and Storage
- **Application Administrator** (or equivalent) in Azure AD to create the CI/CD app registration via Terraform

## Directory layout

```
infra/terraform/
  bootstrap/              # One-time: remote state storage (local state)
  cicd/                   # CI/CD service principal for Azure DevOps (separate state)
  domains/                # Shared: Azure DNS zone + app/dev CNAMEs (optional domain purchase)
  launchdarkly/           # LaunchDarkly feature flags (separate state)
  modules/
    cicd-service-principal/ # App registration + SP + optional federation
    container-registry/   # Azure Container Registry + AcrPull/AcrPush RBAC
    static-assets/        # Public blob storage for marketing images
    key-vault/
    app-configuration/
    launchdarkly-flags/   # Reusable LD flag definitions
    monitoring/
    container-apps/
  environments/
    dev/
    prod/
```

## Step 1 — Bootstrap remote state (one time)

Creates a dedicated resource group, storage account, and private blob container for Terraform state. Bootstrap uses **local state** (only this stack).

```powershell
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
# Set a globally unique storage_account_name (lowercase alphanumeric, 3-24 chars)

terraform init
terraform apply
```

Note the outputs — they match `backend.hcl.example` in each environment.

## Step 2 — Configure backend for an environment

```powershell
cd infra/terraform/environments/dev
cp backend.hcl.example backend.hcl
# Edit storage_account_name if you changed it in bootstrap

terraform init -backend-config=backend.hcl
```

Re-run `terraform init -backend-config=backend.hcl -migrate-state` if you previously used local state.

Prod uses a separate state key (`nextjsapp-prod.tfstate`) — copy and adjust `backend.hcl` in `environments/prod/`.

Backend authentication uses **Azure AD** (`use_azuread_auth = true`). Your user needs **Storage Blob Data Contributor** on the state storage account (granted by bootstrap for the user who ran `apply`).

## Step 2b — CI/CD service principal (one time)

Creates a single Azure AD application + service principal used by Azure DevOps pipelines. Dev and prod stacks read `principal_id` from this stack's remote state automatically.

```powershell
cd infra/terraform/cicd
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars   # optional

terraform init -backend-config=backend.hcl
terraform apply
```

Retrieve credentials for Azure DevOps service connections:

```powershell
terraform output -raw client_id
terraform output -raw client_secret
terraform output -raw tenant_id
terraform output -raw principal_id
```

Use `client_id` + `client_secret` when creating **Docker Registry** service connections (`acr-dev`, `acr-prod`) and **Azure Resource Manager** connections in Azure DevOps. The secret is sensitive — store it in a password manager; rotate by tainting `azuread_service_principal_password.cicd` and re-applying.

Optional: configure **workload identity federation** instead of a client secret by setting `federated_credentials` in `terraform.tfvars` (see `terraform.tfvars.example`).

**Apply order:** bootstrap → **cicd** → dev/prod environments.

## Step 3 — Deploy an environment

```powershell
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# name_prefix must be globally unique for KV, App Config, and ACR names

terraform plan
terraform apply
```

Outputs:

```powershell
terraform output key_vault_name
terraform output app_configuration_endpoint
terraform output acr_name
terraform output acr_login_server
terraform output container_app_fqdn
terraform output managed_identity_client_id
terraform output static_assets_base_url
terraform output static_assets_storage_account_name
```

## Upload static assets to Blob Storage

After `terraform apply`, publish images from `nextjsapp/public/` to the assets container:

```powershell
cd nextjsapp
$env:AZURE_STORAGE_ACCOUNT_NAME = terraform -chdir=../infra/terraform/environments/dev output -raw static_assets_storage_account_name
npm run upload-assets
```

Requires Azure CLI (`az login`) and **Storage Blob Data Contributor** on the static assets account (granted to the Terraform deployer and optional CI/CD principal).

The base URL is written to App Configuration as `app:assets:base-url` and loaded at container startup as `NEXT_PUBLIC_ASSETS_BASE_URL`. When you add a CDN later, update only that App Config value and add the CDN hostname to `images.remotePatterns` in `next.config.ts`.

## Seed secrets (out of band)

```powershell
$kv = terraform output -raw key_vault_name
az keyvault secret set --vault-name $kv --name ld-sdk-key --value "<LaunchDarkly SDK key>"
az keyvault secret set --vault-name $kv --name nr-license-key --value "<New Relic license key>"
az keyvault secret set --vault-name $kv --name sonar-token --value "<SonarCloud token>"
```

The `sonar-token` secret is referenced by App Configuration as `cicd:sonar:token` and read by Azure DevOps build pipelines at runtime.

## Build and push to ACR

```powershell
# From nextjsapp/
npm run build

# Upload static assets (after terraform apply)
$env:AZURE_STORAGE_ACCOUNT_NAME = terraform -chdir=../infra/terraform/environments/dev output -raw static_assets_storage_account_name
npm run upload-assets

$acr = terraform output -raw acr_name
az acr login --name $acr

docker build -f Dockerfile.base -t alma-ubi:latest .
docker build -f Dockerfile.runtime -t "$(terraform output -raw acr_login_server)/nextjsapp:latest" .
docker push "$(terraform output -raw acr_login_server)/nextjsapp:latest"

az containerapp update `
  --name nextjsapp-dev-app `
  --resource-group nextjsapp-dev-rg `
  --image "$(terraform output -raw acr_login_server)/nextjsapp:latest"
```

By default, `container_image` resolves to `<acr_login_server>/nextjsapp:latest`. Push the image before the Container App can start successfully.

## RBAC summary

| Principal | Role | Scope |
|-----------|------|-------|
| Container App UAMI | Key Vault Secrets User | Key Vault |
| Container App UAMI | App Configuration Data Reader | App Configuration |
| Container App UAMI | AcrPull | ACR |
| CI/CD SP | Key Vault Secrets Officer | Key Vault |
| CI/CD SP | AcrPush | ACR |
| CI/CD SP | App Configuration Data Reader | App Configuration |
| Terraform operator / CI/CD SP | Storage Blob Data Contributor | Static assets storage account |
| Terraform operator | Storage Blob Data Contributor | State storage account |
| Terraform operator | Key Vault Secrets Officer | Key Vault |
| Terraform operator | App Configuration Data Owner | App Configuration |

## Environment differences

| Setting | dev | prod |
|---------|-----|------|
| Region (`location`, `acr_location`) | centralus | centralus |
| ACR SKU | Basic | Standard |
| KV purge protection | off | on |
| Log Analytics retention | 30 days | 90 days |
| ACA min replicas | 1 | 1 |

## Security notes

- Terraform state is stored in a private Azure Blob container with versioning enabled.
- App Configuration has `local_auth_enabled = false`; only managed identity / Azure AD auth at runtime.
- No secrets in Container App environment variables — only endpoint, label, and `AZURE_CLIENT_ID`.
- Secret values are never written to Terraform state (`lifecycle { ignore_changes = [value] }` on KV secrets).

## Recovering from a partial apply

Long-running or interrupted `terraform apply` runs can leave resources in Azure that are **not** in Terraform state (for example, a Container Apps environment created before a connection error). A later apply then fails with "resource already exists — needs to be imported".

Reconcile state with Azure, then finish the deploy:

```powershell
cd infra/terraform/environments/dev

# Import orphaned Container Apps resources (if they exist in Azure but not in state)
..\..\scripts\reconcile-partial-apply.ps1 -Environment dev

# Apply the saved plan (or run terraform apply)
terraform apply tfplan
```

To preview imports without writing a plan file:

```powershell
..\..\scripts\reconcile-partial-apply.ps1 -Environment dev -PlanOnly
```

Manual import (if you prefer):

```powershell
$sub = az account show --query id -o tsv
terraform import module.container_apps.azurerm_container_app_environment.this "/subscriptions/$sub/resourceGroups/nextjsapp-dev-rg/providers/Microsoft.App/managedEnvironments/nextjsapp-dev-cae"

# Only if the container app also exists in Azure:
terraform import module.container_apps.azurerm_container_app.this "/subscriptions/$sub/resourceGroups/nextjsapp-dev-rg/providers/Microsoft.App/containerApps/nextjsapp-dev-app"
```

After import, `terraform plan` should show only minor updates (tags, probes, etc.) plus creation of any resources still missing — not a full re-create of the environment.

## Rebuild dev after destroy (soft-deleted names)

Key Vault and App Configuration names are **globally unique**. After `terraform destroy`, dev resources are soft-deleted and the name stays reserved (up to 7 days) unless purged. A new apply may fail with `VaultAlreadyExists`.

**Immediate fix** for `nextjsappdevkv`:

```powershell
az keyvault purge --name nextjsappdevkv
```

Or purge all soft-deleted dev names derived from `name_prefix`:

```powershell
..\..\scripts\purge-soft-deleted-names.ps1 -Environment dev
terraform apply
```

Dev is configured to **purge Key Vault and App Configuration on destroy** (`purge_soft_delete_on_destroy = true` in `environments/dev/versions.tf`), so future destroy/apply cycles should not hit this again. Prod keeps soft-delete retention and purge protection.

| ACA min replicas | 1 | 1 |
| Custom domain | dev.app.sutoremu.com | app.sutoremu.com |

## Custom domain (app.sutoremu.com)

Hosts DNS in **Azure DNS** and maps custom hostnames to Container Apps:

| Hostname | Environment |
|----------|-------------|
| `app.sutoremu.com` | prod |
| `dev.app.sutoremu.com` | dev |

Managed TLS certificates on Container Apps are free. Azure DNS zone cost: **~$0.50/month**.

The domain can be registered through Azure App Service Domains **or** an external registrar (e.g. GoDaddy). Set `register_domain = false` when the domain is already owned elsewhere.

### Prerequisites

- **Dev environment applied** — must export `container_app_fqdn` in remote state (prod is optional; prod CNAME/TXT records are skipped until prod is deployed)
- Domain registered at your registrar (Azure or external)

### Step 1 — Configure the domains stack

```powershell
cd infra/terraform/domains
Copy-Item terraform.tfvars.example terraform.tfvars
Copy-Item backend.hcl.example backend.hcl
# External registrar: register_domain = false (default in example)
# Azure purchase: register_domain = true, plus contact_info.json and consent_agreed_by

terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

This creates the Azure DNS zone and CNAME records pointing at each environment's Container App FQDN (read from remote state).

### Step 1b — GoDaddy (or other external registrar)

After `terraform apply`, delegate DNS to Azure:

```powershell
terraform output name_servers
```

In GoDaddy → **My Products** → **sutoremu.com** → **DNS** → **Nameservers** → **Change** → **Enter my own nameservers**, then paste the four Azure name servers from the output above.

DNS propagation can take up to 48 hours (often much faster). Until delegation completes, `dev.app.sutoremu.com` will not resolve.

You do **not** need to create CNAME records manually in GoDaddy — Terraform manages them in the Azure DNS zone once nameservers are delegated.

### Step 2 — Verify DNS propagation

```powershell
nslookup app.sutoremu.com
nslookup dev.app.sutoremu.com
```

Both should resolve to the respective `*.azurecontainerapps.io` hostnames.

### Step 3 — Bind custom domains and managed certificates

Azure requires a **TXT verification record** (`asuid.<hostname>`) before the custom domain can bind. The domains stack creates this automatically from dev/prod remote state.

**Important:** Apply the domains stack **before** binding custom domains on Container Apps:

```powershell
# 1. Preview dev to get the verification ID (shown in planned outputs)
cd infra/terraform/environments/dev
terraform plan

# 2. Create TXT + CNAME records in Azure DNS
cd ../../domains
terraform apply

# 3. Verify TXT record (may take a few minutes after GoDaddy NS delegation)
nslookup -type=TXT asuid.dev.app.sutoremu.com

# 4. Bind custom domain, managed certificate, and TLS hostname binding
#    (terraform apply runs: custom domain → managed cert → az containerapp hostname bind)
cd ../environments/dev
terraform apply
```

Step 4 creates three resources in order:

1. `azurerm_container_app_custom_domain` — registers the hostname on the Container App
2. `azurerm_container_app_environment_managed_certificate` — provisions the free managed TLS cert
3. `terraform_data.bind_managed_certificate` — runs `az containerapp hostname bind` to attach the cert (`bindingType: SniEnabled`)

**Requires Azure CLI** (`az login`) during `terraform apply` for the bind step. Without it, the domain stays HTTP-only (`bindingType: Disabled`) and HTTPS will fail.

If the verification ID is not yet in remote state, set it manually in `domains/terraform.tfvars`:

```hcl
dev_verification_id = "47EFC8B5090C6F51DC51F9452E43A88725300A2AD64495B3EC94CD78F91B1BAB"
```

Then repeat for prod when ready:

```powershell
cd ../environments/prod
terraform apply
```

If certificate provisioning fails on the first run (DNS still propagating), wait a few minutes and re-run `terraform apply`.

### Verification

| Check | Command / action |
|-------|------------------|
| Azure DNS zone exists | Azure Portal → DNS zones → `sutoremu.com` |
| Nameservers delegated | GoDaddy nameservers match `terraform output name_servers` |
| CNAMEs resolve | `nslookup dev.app.sutoremu.com` |
| HTTPS works | `curl -I https://dev.app.sutoremu.com` |
| Prod hostname | `curl -I https://app.sutoremu.com` (after prod is deployed) |

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Domain purchase denied (Azure) | Use external registrar with `register_domain = false` |
| `contact_info_file is required` | Only needed when `register_domain = true` |
| Hostname does not resolve | Confirm GoDaddy nameservers point to Azure DNS |
| Managed cert stuck provisioning | Confirm CNAMEs resolve; re-run environment `terraform apply` |
| HTTPS connection reset / site unreachable | Custom domain may show `bindingType: Disabled` — re-run `terraform apply` in the environment (bind step requires `az login`) |
| ACA recreated / FQDN changed | Re-apply `domains` stack to update CNAME targets |
| Prod remote state unreadable | Run `terraform init -backend-config=backend.hcl` in `environments/prod` first |

When adding sign-in (Entra ID / NextAuth), register OAuth redirect URIs against `https://app.sutoremu.com/...`, not the raw `azurecontainerapps.io` hostname.

## LaunchDarkly feature flags

Feature flags are managed in a **separate Terraform stack** (`launchdarkly/`) using the [official LaunchDarkly provider](https://registry.terraform.io/providers/launchdarkly/launchdarkly/latest/docs). This keeps flag definitions org-scoped and avoids duplicating them across Azure `dev`/`prod` stacks.

### Flag key contract

The app reads flag keys from `nextjsapp/lib/ldFlags.ts`. Terraform-managed keys must match exactly:

| Terraform resource | Flag key | App constant |
|--------------------|----------|--------------|
| `auth_signup_enabled` | `auth.signupEnabled` | `AUTH_SIGNUP_ENABLED` |

### Prerequisites

- LaunchDarkly API access token with flag write access (`LAUNCHDARKLY_ACCESS_TOKEN`)
- Your LaunchDarkly project key and environment keys (e.g. `development`, `production`)

### Deploy flags

```powershell
cd infra/terraform/launchdarkly
Copy-Item terraform.tfvars.example terraform.tfvars

# Find your project KEY (lowercase — not the display name "Sutoremu"):
$env:LAUNCHDARKLY_ACCESS_TOKEN = "your-api-token"
.\scripts\list-launchdarkly-projects.ps1

# Edit terraform.tfvars: set ld_project_key from script output (often "default")
terraform init
terraform validate
terraform plan
terraform apply
```

`ld_environment_keys` is a **list** and cannot be entered at Terraform's interactive prompt. Set it in `terraform.tfvars`:

```hcl
create_project      = false
ld_project_key      = "default"
ld_environment_keys = ["test"]
```

To **create** a new project instead of using an existing one, set `create_project = true` and `ld_project_key = "sutoremu"` (keys must be lowercase).

### Import existing flag

If `auth.signupEnabled` was created manually in the dashboard:

```shell
terraform import module.flags.launchdarkly_feature_flag.auth_signup_enabled <project_key>/auth.signupEnabled
```

### Troubleshooting `auth.signupEnabled`

The app evaluates `auth.signupEnabled` server-side in `MarketingHeader` and bootstraps the same value for the browser SDK. If the flag toggle shows **ON** in the dashboard but the Sign up button stays hidden:

1. **Check the environment** — `LD_SDK_KEY` in `.env.local` (or Azure App Configuration) must match the environment where you toggled the flag (e.g. **Test**, not Production).
2. **Check the default rule** — When a flag is ON, LaunchDarkly serves the **default rule** (fallthrough) to users who do not match other targeting rules. That rule must serve the **true** variation. If it serves **false**, evaluations return `false` even though the toggle is ON.
   - In the dashboard: open `auth.signupEnabled` → **Targeting** → **Default rule** → set to `true`.
   - In Terraform: `fallthrough.variation` must be `0` (true); `off_variation` handles the OFF state.

You can confirm what the app receives by inspecting `initialBootstrap` in the page HTML — look for `"auth.signupEnabled":true` or `false`.
