variable "org_service_url" {
  type        = string
  description = "Azure DevOps organization URL."
  default     = "https://dev.azure.com/SephieBox"
}

variable "project_name" {
  type        = string
  description = "Azure DevOps project name (looked up; not created)."
  default     = "sutoremu"
}

variable "sonarcloud_token" {
  type        = string
  description = "SonarQube Cloud token for the sonarcloud-sutoremu service connection. Prefer AZDO_SONARCLOUD_TOKEN or TF_VAR_sonarcloud_token."
  sensitive   = true
}

variable "cicd_remote_state" {
  type = object({
    resource_group_name  = string
    storage_account_name = string
    container_name       = string
    key                  = string
  })
  description = "Remote state location for the cicd stack."
  default = {
    resource_group_name  = "nextjsapp-tfstate-rg"
    storage_account_name = "nextjsapptfstate"
    container_name       = "tfstate"
    key                  = "nextjsapp-cicd.tfstate"
  }
}

variable "dev_remote_state" {
  type = object({
    resource_group_name  = string
    storage_account_name = string
    container_name       = string
    key                  = string
  })
  description = "Remote state location for the dev environment stack (subscription + ACR targets for all SCs while prod is aliased)."
  default = {
    resource_group_name  = "nextjsapp-tfstate-rg"
    storage_account_name = "nextjsapptfstate"
    container_name       = "tfstate"
    key                  = "nextjsapp-dev.tfstate"
  }
}
