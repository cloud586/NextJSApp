output "project_id" {
  value       = data.azuredevops_project.sutoremu.id
  description = "Azure DevOps project ID for sutoremu."
}

output "arm_service_connection_ids" {
  value = {
    for name, sc in azuredevops_serviceendpoint_azurerm.arm : name => sc.id
  }
  description = "ARM service connection IDs (both target the dev subscription)."
}

output "acr_service_connection_ids" {
  value = {
    for name, sc in azuredevops_serviceendpoint_dockerregistry.acr : name => sc.id
  }
  description = "Docker Registry service connection IDs (both target the dev ACR)."
}

output "sonarcloud_service_connection_id" {
  value       = azuredevops_serviceendpoint_sonarcloud.sutoremu.id
  description = "SonarCloud service connection ID."
}

output "environment_ids" {
  value = {
    "dev-acr"  = azuredevops_environment.dev_acr.id
    "prod-acr" = azuredevops_environment.prod_acr.id
  }
  description = "ADO environment IDs used by PublishDev / PublishProd."
}

output "acr_registry_url" {
  value       = local.acr_registry_url
  description = "ACR URL used by acr-dev and acr-prod (dev ACR while prod is aliased)."
}

output "subscription_id" {
  value       = local.subscription_id
  description = "Azure subscription ID used by both ARM service connections."
}
