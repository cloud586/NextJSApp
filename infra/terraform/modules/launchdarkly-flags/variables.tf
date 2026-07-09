variable "project_key" {
  type        = string
  description = "LaunchDarkly project key."
}

variable "environment_keys" {
  type        = list(string)
  description = "LaunchDarkly environment keys to configure per-environment flag defaults."
}

variable "tags" {
  type        = list(string)
  description = "Tags applied to managed feature flags."
  default     = ["managed-by-terraform", "auth", "sutoremu"]
}
