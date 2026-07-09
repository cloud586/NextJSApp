variable "name" {
  type        = string
  description = "App Configuration store name (globally unique)."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "tags" {
  type        = map(string)
  description = "Resource tags."
  default     = {}
}

variable "label" {
  type        = string
  description = "App Configuration label for environment-specific keys (e.g. dev, prod)."
}

variable "public_network_access" {
  type        = string
  description = "Public network access: Enabled or Disabled."
  default     = "Enabled"
}

variable "key_vault_uri" {
  type        = string
  description = "Key Vault URI for KV reference key values."
}

variable "user_assigned_identity_id" {
  type        = string
  description = "User-assigned managed identity for Key Vault reference resolution (must already have Key Vault Secrets User)."
}

variable "deployer_principal_id" {
  type        = string
  description = "Object ID of the principal running Terraform (granted App Configuration Data Owner to manage keys)."
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "Log Analytics workspace ID for diagnostics."
}

variable "managed_identity_principal_ids" {
  type        = map(string)
  description = "Map of role assignment name suffix => principal ID for App Configuration Data Reader."
  default     = {}
}

variable "new_relic_app_name" {
  type        = string
  description = "New Relic application name."
  default     = "nextjsapp"
}

variable "log_level" {
  type        = string
  description = "Server log level."
  default     = "info"
}

variable "client_log_level" {
  type        = string
  description = "Client log level passed via SSR."
  default     = "warn"
}

variable "ld_client_side_id" {
  type        = string
  description = "LaunchDarkly client-side ID (non-secret, public LD identifier)."
  default     = ""
}

variable "static_assets_base_url" {
  type        = string
  description = "Public base URL for static assets served from Azure Blob Storage."
}

variable "cicd_acr_login_server" {
  type        = string
  description = "ACR login server for CI/CD pipelines (cicd:acr:login-server)."
}

variable "cicd_acr_name" {
  type        = string
  description = "ACR name for CI/CD pipelines (cicd:acr:name)."
}

variable "cicd_sonar_organization" {
  type        = string
  description = "SonarCloud organization key (cicd:sonar:organization)."
  default     = "sutoremu"
}

variable "cicd_sonar_project_key" {
  type        = string
  description = "SonarCloud project key (cicd:sonar:project-key)."
  default     = "nextjsapp"
}
