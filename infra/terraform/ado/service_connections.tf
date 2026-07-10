# ARM service connections (WIF) — both scoped to the dev subscription while prod is spooled down.
resource "azuredevops_serviceendpoint_azurerm" "arm" {
  for_each = local.arm_connections

  project_id                             = data.azuredevops_project.sutoremu.id
  service_endpoint_name                  = each.key
  description                            = "Managed by Terraform (ado stack). Targets the shared/dev Azure subscription."
  service_endpoint_authentication_scheme = "WorkloadIdentityFederation"

  credentials {
    serviceprincipalid = local.client_id
  }

  azurerm_spn_tenantid      = local.tenant_id
  azurerm_subscription_id   = local.subscription_id
  azurerm_subscription_name = data.azurerm_subscription.current.display_name
}

# Federated credentials on the existing cicd app registration (issuer/subject from each ARM SC).
resource "azuread_application_federated_identity_credential" "arm" {
  for_each = local.arm_connections

  application_id = local.application_id
  display_name   = each.value.federated_display_name
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = azuredevops_serviceendpoint_azurerm.arm[each.key].workload_identity_federation_issuer
  subject        = azuredevops_serviceendpoint_azurerm.arm[each.key].workload_identity_federation_subject
}

# Docker Registry connections for Docker@2 — both point at the dev ACR.
resource "azuredevops_serviceendpoint_dockerregistry" "acr" {
  for_each = local.docker_connections

  project_id            = data.azuredevops_project.sutoremu.id
  service_endpoint_name = each.key
  description           = "Managed by Terraform (ado stack). Targets the shared/dev ACR."
  docker_registry       = local.acr_registry_url
  docker_username       = local.client_id
  docker_password       = local.client_secret
  registry_type         = "Others"
}

resource "azuredevops_serviceendpoint_sonarcloud" "sutoremu" {
  project_id            = data.azuredevops_project.sutoremu.id
  service_endpoint_name = "sonarcloud-sutoremu"
  description           = "Managed by Terraform (ado stack). Pipeline token also loaded from App Config at runtime."
  token                 = var.sonarcloud_token
}
