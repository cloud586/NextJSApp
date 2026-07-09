variable "display_name" {
  type        = string
  description = "Display name for the CI/CD application registration."
  default     = "sutoremu-nextjsapp-cicd"
}

variable "federated_credentials" {
  type = list(object({
    display_name = string
    issuer       = string
    subject      = string
  }))
  description = <<-EOT
    Optional workload identity federation for Azure DevOps service connections.
    Example subject: sc://SephieBox/sutoremu/azure-dev-subscription
    Example issuer:  https://vstmr.dev.azure.com/<azure-devops-tenant-id>
  EOT
  default     = []
}
