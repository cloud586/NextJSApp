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

variable "prod_approval_group_name" {
  type        = string
  description = "Project-scoped ADO group that can approve CD Prod deploys (looked up; not created)."
  default     = "Project Administrators"
}

variable "prod_approver_emails" {
  type        = list(string)
  description = "Optional extra approvers looked up by Azure DevOps principal name (email). Must already exist in the org."
  default     = []
}

variable "prod_requester_can_approve" {
  type        = bool
  description = "When true, the user who queued the CD run may also approve Prod. Default true for a solo operator."
  default     = true
}

variable "prod_approval_timeout_minutes" {
  type        = number
  description = "How long the Prod approval check waits before failing (ADO UI default is 30 days)."
  default     = 10080
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
