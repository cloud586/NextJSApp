variable "display_name" {
  type        = string
  description = "Display name for the CI/CD application registration."
}

variable "federated_credentials" {
  type = list(object({
    display_name = string
    issuer       = string
    subject      = string
  }))
  description = "Optional workload identity federation credentials (e.g. Azure DevOps service connections)."
  default     = []
}
