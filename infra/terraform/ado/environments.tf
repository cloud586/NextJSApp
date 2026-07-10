resource "azuredevops_environment" "dev_acr" {
  project_id  = data.azuredevops_project.sutoremu.id
  name        = "dev-acr"
  description = "Managed by Terraform — PublishDev ACR push."
}

resource "azuredevops_environment" "prod_acr" {
  project_id  = data.azuredevops_project.sutoremu.id
  name        = "prod-acr"
  description = "Managed by Terraform — PublishProd ACR push (currently aliases to dev ACR)."
}

# Authorize all pipelines to use each service connection and environment.
resource "azuredevops_pipeline_authorization" "arm" {
  for_each = azuredevops_serviceendpoint_azurerm.arm

  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = each.value.id
  type        = "endpoint"
}

resource "azuredevops_pipeline_authorization" "acr" {
  for_each = azuredevops_serviceendpoint_dockerregistry.acr

  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = each.value.id
  type        = "endpoint"
}

resource "azuredevops_pipeline_authorization" "sonarcloud" {
  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = azuredevops_serviceendpoint_sonarcloud.sutoremu.id
  type        = "endpoint"
}

resource "azuredevops_pipeline_authorization" "dev_acr_env" {
  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = azuredevops_environment.dev_acr.id
  type        = "environment"
}

resource "azuredevops_pipeline_authorization" "prod_acr_env" {
  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = azuredevops_environment.prod_acr.id
  type        = "environment"
}
