terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }
}

module "cicd_service_principal" {
  source = "../modules/cicd-service-principal"

  display_name          = var.display_name
  federated_credentials = var.federated_credentials
}
