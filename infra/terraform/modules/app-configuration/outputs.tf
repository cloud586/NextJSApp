output "id" {
  value       = azurerm_app_configuration.this.id
  description = "App Configuration store resource ID."
}

output "endpoint" {
  value       = azurerm_app_configuration.this.endpoint
  description = "App Configuration endpoint URL."
}

output "name" {
  value       = azurerm_app_configuration.this.name
  description = "App Configuration store name."
}
