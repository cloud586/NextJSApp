output "application_id" {
  value       = azuread_application.cicd.id
  description = "Application (object) ID."
}

output "client_id" {
  value       = azuread_application.cicd.client_id
  description = "Application (client) ID for Azure DevOps service connections."
}

output "principal_id" {
  value       = azuread_service_principal.cicd.id
  description = "Service principal object ID for Azure RBAC (cicd_principal_id)."
}

output "client_secret" {
  value       = azuread_service_principal_password.cicd.value
  description = "Client secret for Azure DevOps Docker Registry / ARM connections."
  sensitive   = true
}

output "tenant_id" {
  value       = data.azuread_client_config.current.tenant_id
  description = "Azure AD tenant ID."
}
