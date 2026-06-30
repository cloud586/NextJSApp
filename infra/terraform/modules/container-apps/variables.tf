variable "name_prefix" {
  type        = string
  description = "Prefix for Container Apps resources."
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

variable "container_image" {
  type        = string
  description = "Full container image reference (e.g. myacr.azurecr.io/nextjsapp:latest)."
}

variable "acr_login_server" {
  type        = string
  description = "ACR login server hostname for the Container App registry block."
}

variable "app_config_endpoint" {
  type        = string
  description = "Azure App Configuration endpoint URL."
}

variable "app_config_label" {
  type        = string
  description = "App Configuration label."
}

variable "min_replicas" {
  type        = number
  description = "Minimum container replicas."
  default     = 0
}

variable "max_replicas" {
  type        = number
  description = "Maximum container replicas."
  default     = 3
}

variable "zone_redundancy_enabled" {
  type        = bool
  description = "Enable zone redundancy on the Container Apps environment."
  default     = false
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "Log Analytics workspace ID for the Container Apps environment."
}

variable "infrastructure_subnet_id" {
  type        = string
  description = "Optional subnet ID for VNet-integrated Container Apps environment."
  default     = null
}

variable "managed_identity_id" {
  type        = string
  description = "User-assigned managed identity resource ID."
}

variable "managed_identity_principal_id" {
  type        = string
  description = "User-assigned managed identity principal ID."
}

variable "managed_identity_client_id" {
  type        = string
  description = "User-assigned managed identity client ID."
}
