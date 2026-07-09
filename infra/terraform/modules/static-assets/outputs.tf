output "storage_account_name" {
  value       = azurerm_storage_account.this.name
  description = "Storage account name for static asset uploads."
}

output "container_name" {
  value       = azurerm_storage_container.assets.name
  description = "Blob container name for static assets."
}

output "base_url" {
  value       = "https://${azurerm_storage_account.this.name}.blob.core.windows.net/${azurerm_storage_container.assets.name}"
  description = "Public base URL for static assets (CDN-ready)."
}
