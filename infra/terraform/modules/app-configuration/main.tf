locals {
  kv_ref_content_type = "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8"

  app_key_vault_refs = {
    "app:ld:sdk-key" = {
      secret_name = "ld-sdk-key"
    }
    "app:newrelic:license-key" = {
      secret_name = "nr-license-key"
    }
  }

  cicd_key_vault_refs = {
    "cicd:sonar:token" = {
      secret_name = "sonar-token"
    }
  }

  key_vault_refs = merge(local.app_key_vault_refs, local.cicd_key_vault_refs)

  app_plain_keys = {
    "app:newrelic:app-name"    = var.new_relic_app_name
    "app:logging:server-level" = var.log_level
    "app:logging:client-level" = var.client_log_level
    "app:ld:client-side-id"    = var.ld_client_side_id
    "app:assets:base-url"      = var.static_assets_base_url
  }

  cicd_plain_keys = {
    "cicd:acr:login-server"     = var.cicd_acr_login_server
    "cicd:acr:name"               = var.cicd_acr_name
    "cicd:sonar:organization"     = var.cicd_sonar_organization
    "cicd:sonar:project-key"      = var.cicd_sonar_project_key
  }

  plain_keys = merge(local.app_plain_keys, local.cicd_plain_keys)
}

resource "azurerm_app_configuration" "this" {
  name                  = var.name
  location              = var.location
  resource_group_name   = var.resource_group_name
  sku                   = "standard"
  public_network_access = var.public_network_access
  local_auth_enabled    = false
  tags                  = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [var.user_assigned_identity_id]
  }
}

resource "azurerm_role_assignment" "deployer_data_owner" {
  scope                = azurerm_app_configuration.this.id
  role_definition_name = "App Configuration Data Owner"
  principal_id         = var.deployer_principal_id
}

resource "azurerm_app_configuration_key" "key_vault_refs" {
  for_each = local.key_vault_refs

  configuration_store_id = azurerm_app_configuration.this.id
  key                    = each.key
  label                  = var.label
  type                   = "vault"
  content_type           = local.kv_ref_content_type
  vault_key_reference    = "${var.key_vault_uri}secrets/${each.value.secret_name}"

  depends_on = [azurerm_role_assignment.deployer_data_owner]
}

resource "azurerm_app_configuration_key" "plain" {
  for_each = local.plain_keys

  configuration_store_id = azurerm_app_configuration.this.id
  key                    = each.key
  label                  = var.label
  value                  = each.value

  depends_on = [azurerm_role_assignment.deployer_data_owner]
}

resource "azurerm_role_assignment" "data_reader" {
  for_each = var.managed_identity_principal_ids

  scope                = azurerm_app_configuration.this.id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = each.value
}

resource "azurerm_monitor_diagnostic_setting" "app_config" {
  name                       = "appconfig-diagnostics"
  target_resource_id         = azurerm_app_configuration.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "HttpRequest"
  }

  enabled_log {
    category = "Audit"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
