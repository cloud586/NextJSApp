variable "location" {
  type        = string
  description = "Azure region."
  default     = "centralus"
}

variable "name_prefix" {
  type        = string
  description = "Short unique prefix for resource names."
  default     = "nextjsapp-dev"
}

variable "container_image" {
  type        = string
  description = "Container image to deploy. Defaults to <acr>/nextjsapp:latest."
  default     = null
}

variable "acr_sku" {
  type        = string
  description = "Azure Container Registry SKU."
  default     = "Basic"
}

variable "acr_location" {
  type        = string
  description = "Azure region for Container Registry (can differ from location when a region is at capacity)."
  default     = "centralus"
}

variable "ld_client_side_id" {
  type        = string
  description = "LaunchDarkly client-side ID."
  default     = ""
}

variable "cicd_principal_id" {
  type        = string
  description = "Optional CI/CD service principal object ID for Key Vault Secrets Officer."
  default     = null
}

locals {
  environment = "dev"
  tags = {
    environment  = local.environment
    app          = "nextjsapp"
    managed-by   = "terraform"
  }
  container_image = coalesce(
    var.container_image,
    "${module.container_registry.login_server}/nextjsapp:latest",
  )
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_provider_registration" "app" {
  name = "Microsoft.App"
}

resource "azurerm_resource_group" "this" {
  name     = "${var.name_prefix}-rg"
  location = var.location
  tags     = local.tags
}

module "monitoring" {
  source = "../../modules/monitoring"

  name_prefix           = var.name_prefix
  location              = azurerm_resource_group.this.location
  resource_group_name   = azurerm_resource_group.this.name
  retention_in_days     = 30
  tags                  = local.tags
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.name_prefix}-uami"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags
}

module "key_vault" {
  source = "../../modules/key-vault"

  name                          = replace("${var.name_prefix}-kv", "-", "")
  location                      = azurerm_resource_group.this.location
  resource_group_name           = azurerm_resource_group.this.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  tags                          = local.tags
  purge_protection_enabled      = false
  soft_delete_retention_days    = 7
  public_network_access_enabled = true
  log_analytics_workspace_id    = module.monitoring.log_analytics_workspace_id

  deployer_principal_id = data.azurerm_client_config.current.object_id

  managed_identity_principal_ids = {
    app = azurerm_user_assigned_identity.app.principal_id
  }

  secrets_officer_principal_ids = var.cicd_principal_id != null ? {
    cicd = var.cicd_principal_id
  } : {}
}

module "app_configuration" {
  source = "../../modules/app-configuration"

  name                        = replace("${var.name_prefix}-appcfg", "-", "")
  location                    = azurerm_resource_group.this.location
  resource_group_name         = azurerm_resource_group.this.name
  tags                        = local.tags
  label                       = local.environment
  public_network_access       = "Enabled"
  key_vault_uri               = module.key_vault.vault_uri
  user_assigned_identity_id   = azurerm_user_assigned_identity.app.id
  deployer_principal_id       = data.azurerm_client_config.current.object_id
  log_analytics_workspace_id  = module.monitoring.log_analytics_workspace_id
  ld_client_side_id           = var.ld_client_side_id

  managed_identity_principal_ids = {
    app = azurerm_user_assigned_identity.app.principal_id
  }

  depends_on = [module.key_vault]
}

module "container_registry" {
  source = "../../modules/container-registry"

  name                = replace("${var.name_prefix}acr", "-", "")
  location            = var.acr_location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags
  sku                 = var.acr_sku

  pull_principal_ids = {
    app = azurerm_user_assigned_identity.app.principal_id
  }

  push_principal_ids = var.cicd_principal_id != null ? {
    cicd = var.cicd_principal_id
  } : {}
}

module "container_apps" {
  source = "../../modules/container-apps"

  name_prefix                   = var.name_prefix
  location                      = azurerm_resource_group.this.location
  resource_group_name           = azurerm_resource_group.this.name
  tags                          = local.tags
  container_image               = local.container_image
  acr_login_server              = module.container_registry.login_server
  app_config_endpoint           = module.app_configuration.endpoint
  app_config_label              = local.environment
  min_replicas                  = 0
  max_replicas                  = 2
  zone_redundancy_enabled       = false
  log_analytics_workspace_id    = module.monitoring.log_analytics_workspace_id
  managed_identity_id           = azurerm_user_assigned_identity.app.id
  managed_identity_principal_id = azurerm_user_assigned_identity.app.principal_id
  managed_identity_client_id    = azurerm_user_assigned_identity.app.client_id

  depends_on = [
    azurerm_resource_provider_registration.app,
    module.app_configuration,
    module.container_registry,
  ]
}
