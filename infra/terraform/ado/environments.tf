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

resource "azuredevops_environment" "dev" {
  project_id  = data.azuredevops_project.sutoremu.id
  name        = "dev"
  description = "Managed by Terraform — Container App deploy (CD Dev stage). No approval."
}

resource "azuredevops_environment" "prod" {
  project_id  = data.azuredevops_project.sutoremu.id
  name        = "prod"
  description = "Managed by Terraform — Container App deploy (CD Prod stage). Approval check is Terraform-managed."
}

data "azuredevops_group" "prod_approval" {
  project_id = data.azuredevops_project.sutoremu.id
  name       = var.prod_approval_group_name
}

data "azuredevops_users" "prod_approvers" {
  for_each = toset(var.prod_approver_emails)

  principal_name = each.value
}

resource "azuredevops_check_approval" "prod" {
  project_id           = data.azuredevops_project.sutoremu.id
  target_resource_id   = azuredevops_environment.prod.id
  target_resource_type = "environment"

  requester_can_approve      = var.prod_requester_can_approve
  timeout                    = var.prod_approval_timeout_minutes
  instructions               = "Approve to deploy this build to the production Container App (nextjsapp-prod-app)."
  minimum_required_approvers = 1
  approvers = concat(
    [data.azuredevops_group.prod_approval.origin_id],
    [for u in data.azuredevops_users.prod_approvers : one(u.users).id],
  )
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

resource "azuredevops_pipeline_authorization" "dev_env" {
  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = azuredevops_environment.dev.id
  type        = "environment"
}

resource "azuredevops_pipeline_authorization" "prod_env" {
  project_id  = data.azuredevops_project.sutoremu.id
  resource_id = azuredevops_environment.prod.id
  type        = "environment"
}
