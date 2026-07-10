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
    Optional extra workload identity federation credentials on the cicd app.
    Pipeline ARM connections (azure-dev-subscription / azure-prod-subscription) are
    federated automatically by the ado stack — leave this empty unless you need more.
  EOT
  default     = []
}
