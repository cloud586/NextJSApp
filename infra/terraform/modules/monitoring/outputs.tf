output "log_analytics_workspace_id" {
  value       = azurerm_log_analytics_workspace.this.id
  description = "Log Analytics workspace resource ID."
}

output "log_analytics_workspace_name" {
  value       = azurerm_log_analytics_workspace.this.name
  description = "Log Analytics workspace name."
}
