output "application_id" {
  value       = module.cicd_service_principal.application_id
  description = "Application (object) ID."
}

output "client_id" {
  value       = module.cicd_service_principal.client_id
  description = "Application (client) ID for Azure DevOps service connections."
}

output "principal_id" {
  value       = module.cicd_service_principal.principal_id
  description = "Service principal object ID — used as cicd_principal_id in dev/prod stacks."
}

output "client_secret" {
  value       = module.cicd_service_principal.client_secret
  description = "Client secret for ADO Docker Registry connections (acr-dev, acr-prod)."
  sensitive   = true
}

output "tenant_id" {
  value       = module.cicd_service_principal.tenant_id
  description = "Azure AD tenant ID."
}
