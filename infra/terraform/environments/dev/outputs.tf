output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "key_vault_name" {
  value = module.key_vault.name
}

output "app_configuration_endpoint" {
  value = module.app_configuration.endpoint
}

output "app_configuration_name" {
  value = module.app_configuration.name
}

output "container_app_fqdn" {
  value = module.container_apps.container_app_fqdn
}

output "container_app_custom_domain_verification_id" {
  value       = nonsensitive(module.container_apps.container_app_custom_domain_verification_id)
  description = "Verification ID for asuid.* TXT records in the domains stack."
}

output "acr_login_server" {
  value = module.container_registry.login_server
}

output "acr_name" {
  value = module.container_registry.name
}

output "managed_identity_client_id" {
  value = azurerm_user_assigned_identity.app.client_id
}

output "static_assets_base_url" {
  value = module.static_assets.base_url
}

output "static_assets_storage_account_name" {
  value = module.static_assets.storage_account_name
}
