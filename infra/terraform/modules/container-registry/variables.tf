variable "name" {
  type        = string
  description = "ACR name (globally unique, alphanumeric only, 5-50 chars)."
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

variable "sku" {
  type        = string
  description = "ACR SKU (Basic, Standard, Premium)."
  default     = "Basic"
}

variable "pull_principal_ids" {
  type        = map(string)
  description = "Principal IDs granted AcrPull on this registry."
  default     = {}
}

variable "push_principal_ids" {
  type        = map(string)
  description = "Principal IDs granted AcrPush on this registry (e.g. CI/CD)."
  default     = {}
}
