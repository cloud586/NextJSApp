variable "name" {
  type        = string
  description = "Key Vault name (globally unique, 3-24 alphanumeric)."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "tenant_id" {
  type        = string
  description = "Azure AD tenant ID."
}

variable "tags" {
  type        = map(string)
  description = "Resource tags."
  default     = {}
}

variable "purge_protection_enabled" {
  type        = bool
  description = "Enable purge protection (recommended for prod)."
  default     = false
}

variable "soft_delete_retention_days" {
  type        = number
  description = "Soft-delete retention in days."
  default     = 7
}

variable "public_network_access_enabled" {
  type        = bool
  description = "Allow public network access to Key Vault."
  default     = true
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "Log Analytics workspace ID for diagnostics."
}

variable "secret_names" {
  type        = list(string)
  description = "Secret slot names to create as placeholders (values set out-of-band)."
  default     = ["ld-sdk-key", "nr-license-key"]
}

variable "managed_identity_principal_ids" {
  type        = map(string)
  description = "Map of role assignment name suffix => principal ID for Key Vault Secrets User."
  default     = {}
}

variable "secrets_officer_principal_ids" {
  type        = map(string)
  description = "Map of role assignment name suffix => principal ID for Key Vault Secrets Officer (CI/CD)."
  default     = {}
}

variable "deployer_principal_id" {
  type        = string
  description = "Object ID of the principal running Terraform (granted Key Vault Secrets Officer to manage placeholder secrets)."
}
