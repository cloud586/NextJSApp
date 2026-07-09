variable "name" {
  type        = string
  description = "Storage account name (globally unique, lowercase alphanumeric, 3-24 chars)."
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

variable "container_name" {
  type        = string
  description = "Blob container name for public static assets."
  default     = "assets"
}

variable "deployer_principal_id" {
  type        = string
  description = "Object ID of the principal running Terraform (granted Storage Blob Data Contributor)."
}

variable "upload_principal_ids" {
  type        = map(string)
  description = "Map of role assignment name suffix => principal ID for Storage Blob Data Contributor (e.g. CI/CD)."
  default     = {}
}
