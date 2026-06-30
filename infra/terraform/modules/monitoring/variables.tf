variable "name_prefix" {
  type        = string
  description = "Prefix for monitoring resource names."
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

variable "retention_in_days" {
  type        = number
  description = "Log Analytics retention in days."
  default     = 30
}
