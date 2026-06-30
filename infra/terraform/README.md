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

## Directory layout

```
infra/terraform/
  bootstrap/              # One-time: remote state storage (local state)
  modules/
    container-registry/   # Azure Container Registry + AcrPull/AcrPush RBAC
    key-vault/
    app-configuration/
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
```

## Seed secrets (out of band)

```powershell
$kv = terraform output -raw key_vault_name
az keyvault secret set --vault-name $kv --name ld-sdk-key --value "<LaunchDarkly SDK key>"
az keyvault secret set --vault-name $kv --name nr-license-key --value "<New Relic license key>"
```

## Build and push to ACR

```powershell
# From nextjsapp/
npm run build

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
| CI/CD SP (optional) | Key Vault Secrets Officer | Key Vault |
| CI/CD SP (optional) | AcrPush | ACR |
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
| ACA min replicas | 0 | 1 |

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
