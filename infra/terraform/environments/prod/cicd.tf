variable "cicd_principal_id" {
  type        = string
  description = "Override CI/CD service principal object ID. When null, reads from the cicd Terraform stack remote state."
  default     = null
}

variable "enable_cicd_remote_state" {
  type        = bool
  description = "Load cicd_principal_id from the cicd stack remote state when cicd_principal_id is not set."
  default     = true
}

variable "cicd_remote_state" {
  type = object({
    resource_group_name  = string
    storage_account_name = string
    container_name       = string
    key                  = string
  })
  description = "Remote state location for the cicd stack (nextjsapp-cicd.tfstate)."
  default = {
    resource_group_name  = "nextjsapp-tfstate-rg"
    storage_account_name = "nextjsapptfstate"
    container_name       = "tfstate"
    key                  = "nextjsapp-cicd.tfstate"
  }
}

data "terraform_remote_state" "cicd" {
  count = var.enable_cicd_remote_state && var.cicd_principal_id == null ? 1 : 0

  backend = "azurerm"

  config = {
    resource_group_name  = var.cicd_remote_state.resource_group_name
    storage_account_name = var.cicd_remote_state.storage_account_name
    container_name       = var.cicd_remote_state.container_name
    key                  = var.cicd_remote_state.key
    use_azuread_auth     = true
  }
}

locals {
  cicd_principal_id = coalesce(
    var.cicd_principal_id,
    try(data.terraform_remote_state.cicd[0].outputs.principal_id, null),
  )
}
