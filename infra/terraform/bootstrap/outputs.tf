output "resource_group_name" {
  value       = azurerm_resource_group.tfstate.name
  description = "Resource group hosting Terraform state storage."
}

output "storage_account_name" {
  value       = azurerm_storage_account.tfstate.name
  description = "Storage account for Terraform state blobs."
}

output "container_name" {
  value       = azurerm_storage_container.tfstate.name
  description = "Blob container for Terraform state files."
}
