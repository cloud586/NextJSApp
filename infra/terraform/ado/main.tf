terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azuredevops = {
      source  = "microsoft/azuredevops"
      version = "~> 1.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azuredevops" {
  org_service_url = var.org_service_url
  # Auth: AZDO_PERSONAL_ACCESS_TOKEN (or Entra SP / OIDC — see provider docs).
}

provider "azuread" {}

provider "azurerm" {
  features {}
}

data "azuredevops_project" "sutoremu" {
  name = var.project_name
}

data "azurerm_subscription" "current" {
  subscription_id = local.subscription_id
}

data "terraform_remote_state" "cicd" {
  backend = "azurerm"

  config = {
    resource_group_name  = var.cicd_remote_state.resource_group_name
    storage_account_name = var.cicd_remote_state.storage_account_name
    container_name       = var.cicd_remote_state.container_name
    key                  = var.cicd_remote_state.key
    use_azuread_auth     = true
  }
}

data "terraform_remote_state" "dev" {
  backend = "azurerm"

  config = {
    resource_group_name  = var.dev_remote_state.resource_group_name
    storage_account_name = var.dev_remote_state.storage_account_name
    container_name       = var.dev_remote_state.container_name
    key                  = var.dev_remote_state.key
    use_azuread_auth     = true
  }
}

locals {
  # Cost-saving: prod-named connections target the same Azure subscription + ACR as dev.
  client_id        = data.terraform_remote_state.cicd.outputs.client_id
  client_secret    = data.terraform_remote_state.cicd.outputs.client_secret
  tenant_id        = data.terraform_remote_state.cicd.outputs.tenant_id
  application_id   = data.terraform_remote_state.cicd.outputs.application_id
  subscription_id  = data.terraform_remote_state.dev.outputs.subscription_id
  acr_login_server = data.terraform_remote_state.dev.outputs.acr_login_server
  acr_registry_url = "https://${local.acr_login_server}"

  arm_connections = {
    "azure-dev-subscription" = {
      federated_display_name = "ado-azure-dev-subscription"
    }
    "azure-prod-subscription" = {
      federated_display_name = "ado-azure-prod-subscription"
    }
  }

  docker_connections = toset(["acr-dev", "acr-prod"])
}
